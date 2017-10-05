var env, forecastIoUrl, getTemp, googleMapUrl, lookupAddress, lookupForecast, lookupWeather;

env = process.env;

process.env.HUBOT_FORECAST_API_KEY = "199e21fb5ee0f14667957f233a3d54c5";
process.env.HUBOT_WEATHER_CELSIUS = true;

forecastIoUrl = 'https://api.forecast.io/forecast/' + process.env.HUBOT_FORECAST_API_KEY + '/';

googleMapUrl = 'http://maps.googleapis.com/maps/api/geocode/json';

lookupAddress = function (msg, location, cb) {
    return msg.http(googleMapUrl).query({
        address: location,
        sensor: true
    }).get()(function (err, res, body) {
        var coords;
        try {
            body = JSON.parse(body);
            coords = body.results[0].geometry.location;
        } catch (_error) {
            err = _error;
            err = "Could not find " + location;
            return cb(msg, null, err);
        }
        return cb(msg, coords, err);
    });
};

lookupWeather = function (msg, coords, err) {
    var url;
    if (err) {
        return msg.send(err);
    }
    if (!env.HUBOT_FORECAST_API_KEY) {
        return msg.send("You need to set env.HUBOT_FORECAST_API_KEY to get weather data");
    }
    url = forecastIoUrl + coords.lat + ',' + coords.lng;
    return msg.http(url).query({
        units: 'ca'
    }).get()(function (err, res, body) {
        var current, humidity, temperature, text;
        if (err) {
            return msg.send('Could not get weather data');
        }
        try {
            body = JSON.parse(body);
            current = body.currently;
        } catch (_error) {
            err = _error;
            return msg.send("Could not parse weather data.");
        }
        humidity = (current.humidity * 100).toFixed(0);
        temperature = getTemp(current.temperature);
        text = "It is currently " + temperature + " " + current.summary + ", " + humidity + "% humidity";
        return msg.send(text);
    });
};

lookupForecast = function (msg, coords, err) {
    var url;
    if (err) {
        return msg.send(err);
    }
    if (!env.HUBOT_FORECAST_API_KEY) {
        return msg.send("You need to set env.HUBOT_FORECAST_API_KEY to get weather data");
    }
    url = forecastIoUrl + coords.lat + ',' + coords.lng;
    return msg.http(url).query({
        units: 'ca'
    }).get()(function (err, res, body) {
        var appendText, dayAfter, forecast, text, today, tomorrow;
        if (err) {
            return msg.send('Could not get weather forecast');
        }
        try {
            body = JSON.parse(body);
            forecast = body.daily.data;
            today = forecast[0];
            tomorrow = forecast[1];
            dayAfter = forecast[2];
        } catch (_error) {
            err = _error;
            return msg.send('Unable to parse forecast data.');
        }
        text = "The weather for:\n";
        appendText = function (text, data) {
            var dateToday, day, humidity, maxTemp, minTemp, month;
            dateToday = new Date(data.time * 1000);
            month = dateToday.getMonth() + 1;
            day = dateToday.getDate();
            humidity = (data.humidity * 100).toFixed(0);
            maxTemp = getTemp(data.temperatureMax);
            minTemp = getTemp(data.temperatureMin);
            text += month + "/" + day + " - High of " + maxTemp + ", low of: " + minTemp + " ";
            text += data.summary + " " + humidity + "% humidity\n";
            return text;
        };
        text = appendText(text, today);
        text = appendText(text, tomorrow);
        text = appendText(text, dayAfter);
        return msg.send(text);
    });
};

getTemp = function (c) {
    if (env.HUBOT_WEATHER_CELSIUS) {
        return c.toFixed(0) + "ºC";
    }
    return ((c * 1.8) + 32).toFixed(0) + "ºF";
};

module.exports = function (robot) {

    robot.router.get("/hubot/ciao", function (req, res) {
        //console.log(data);
        res.send('Ciao, come va? \nInserisci la tua email');
    });

    robot.router.post("/hubot/prova", function (req, res) {
        var data = JSON.stringify({
            foo: 'bar'
        });
        console.log("Post eseguita");
        res.send(data);
    });

    robot.router.post("hubot/weather/:location", function (req, res) {
        var location = req.params.location;
        console.log(location);
        //location = msg.match[1];
        //return lookupAddress(res, location, lookupWeather);
    });

    return robot.respond(/forecast(?: me|for|in)?\s(.*)/i, function (msg) {
        var location;
        location = msg.match[1];
        return lookupAddress(msg, location, lookupForecast);
    }); 
};