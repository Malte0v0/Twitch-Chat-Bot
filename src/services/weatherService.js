export class WeatherService {
    constructor(commandPrefix, db, chatService) {
        this._commandPrefix = commandPrefix;
        this._db = db;
        this._chatService = chatService;

        this._weatherApi = process.env.WEATHER_API;
    }

    parseCommand(messageText, setLocation=false) {
        let pattern;
        if (setLocation) {
            pattern = new RegExp(`\\${this._commandPrefix}location (.+)`);
        } else {
            pattern = new RegExp(`\\${this._commandPrefix}(?:w|weather) (.+)`);
        }
        const match = messageText.match(pattern);
    
        if (!match) {
            return;
        }
    
        const cityName = match[1];
        return cityName;
    }

    parseWeatherJson(weatherJson) {
        const weather = weatherJson.current;

        const parsed = {
            tempC: weather.temp,
            tempF: ((weather.temp * 9/5) + 32).toFixed(2),
            feelsLikeC: weather.feels_like,
            feelsLikeF: ((weather.feels_like * 9/5) + 32).toFixed(2),
            pressure: weather.pressure,
            humidity: weather.humidity,
            uvi: weather.uvi,
            clouds: weather.clouds,
            windSpeed: weather.wind_speed,
            alert: weatherJson.alerts ? `⚠️ Alert: ${weatherJson.alerts.slice(-1)[0].event}` : "",
            emoji: this.getWeatherEmoji(weather.weather[0]),
        }

        return parsed;
    }

    noCityCommand(sender) {
        const location = this._db.prepare(`
            SELECT location FROM location
            WHERE sender = ?
        `).get(sender);

        return location.location;
    }

    async weatherCommand(messageText, data) {
        const sender = data.payload.event.chatter_user_login.toLowerCase();
        let cityName = this.parseCommand(messageText);

        if (!cityName) {
            cityName = this.noCityCommand(sender);
        };

        console.log(cityName);

        const [geocode, weatherJson] = await this.getWeather(cityName);

        if (!geocode || !weatherJson) {
            return;
        }

        const weather = this.parseWeatherJson(weatherJson);

        const city = geocode.name;
        const country = geocode.country;
        
        await this._chatService.sendChatMessage(
            `@${sender}, ${city}, ${country} (now): ${weather.emoji} ${weather.tempC}°C (${weather.tempF}°F), \
            feels like ${weather.feelsLikeC}°C (${weather.feelsLikeF}°F). \
            UV index: ${weather.uvi}. Cloud cover: ${weather.clouds}%. \
            Wind speed: ${weather.windSpeed} m/s. Humidity: ${weather.humidity}%. \
            Air pressure: ${weather.pressure} hPa. ${weather.alert}`
        );

    }

    async locationCommand(messageText, data) {
        const sender = data.payload.event.chatter_user_login.toLowerCase();
        const cityName = this.parseCommand(messageText, true);

        if (!cityName) {
            console.log(sender, cityName, "failed to get city name");
            return;
        }

        const insert = this._db.prepare(`
            INSERT OR REPLACE INTO location (sender, location)
            VALUES (?,?)
        `);
        const result = insert.run(sender, cityName);

        if (result.lastInsertRowid) {
            await this._chatService.sendChatMessage(`@${sender}, your default location has been set to ${cityName}`);
        }
    }

    getWeatherEmoji(weather) {
        if (!weather || !weather.id || !weather.main) {
            return "❓";
        }

        const main = weather.main.toLowerCase();
        const id = weather.id;

        switch (main) {
            case "clear":
                return "☀️";
            case "clouds":
                if (id === 801) return "🌤️";
                if (id === 802) return "⛅";
                if (id >= 803) return "☁️";
                return "🌥️";
            case "rain":
                return "🌧️";
            case "drizzle":
                return "🌦️";
            case "thunderstorm":
                return "⛈️";
            case "snow":
                return "❄️";
            case "mist":
            case "fog":
            case "haze":
            case "smoke":
            case "dust":
            case "sand":
            case "ash":
                return "🌫️";
            case "squall":
            case "tornado":
                return "🌪️";
            default:
                return "❓";
        }
    }

    async getWeather(cityName) {
        try {
            const geocode = await this.getGeocode(cityName);
            if (!geocode) {
                return;
            }
            const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${geocode.lat}&lon=${geocode.lon}&appid=${this._weatherApi}&units=metric`);
            if (!response.ok) throw new Error("Network error:" + response.statusText);
            const data = await response.json();
            
            return [geocode, data];
        } catch (error) {
            console.warn(error);
        }
    }

    async getGeocode(cityName) {
        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${this._weatherApi}`);
            if (!response.ok) throw new Error("Weather API geocoding network error:" + response.statusText);
            const data = await response.json();

            const lat = data[0].lat;
            const lon = data[0].lon;
            const name = data[0].name;
            const country = data[0].country;

            return {lat, lon, name, country};
        } catch (error) {
            await this._chatService.sendChatMessage("Could not find location " + cityName);
        }
    }
}