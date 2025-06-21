export class WeatherService {
    constructor(commandPrefix, chatService) {
        this._commandPrefix = commandPrefix;
        this._chatService = chatService;

        this._weatherApi = process.env.WEATHER_API;
    }

    async weatherCommand(messageText, data) {
        const pattern = new RegExp(`\\${this._commandPrefix}weather (.+)`);
        const match = messageText.match(pattern);

        if (!match) throw new Error("Weather command, no match in message");

        const cityName = match[1];
        const sender = data.payload.event.chatter_user_login.toLowerCase();
        const {geocode, weatherJson} = await this.getWeather(cityName);

        // Parse Json
        const weather = weatherJson.current;
        const temp = weather.temp;
        const feelsLike = weather.feels_like;
        const pressure = weather.pressure;
        const humidity = weather.humidity;
        const dewPoint = weather.dew_point
        const uvi = weather.uvi;
        const clouds = weather.clouds;
        const visibility = weather.visibility;
        const windSpeed = weather.wind_speed;

        const city = geocode.name;
        const country = geocode.country;
        const emoji = this.getWeatherEmoji(weather);
        
        await this._chatService.sendChatMessage(`@${sender}, ${city}, ${country} (now): ${emoji} ${temp}°C, feels like ${feelsLike}°C. \
            UV index:${uvi}. Cloud cover: ${clouds}%. Dew point:${dewPoint}. Visibility:${visibility}. \
            Wind speed: ${windSpeed} m/s. Humidity: ${humidity}%. Air pressure:${pressure} hPa.`);

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
            const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${geocode.lat}&lon=${geocode.lon}&appid=${this._weatherApi}&units=metric`);
            if (!response.ok) throw new Error("Network error:" + response.statusText);
            const data = await response.json();

            return {geocode, data};
        } catch (error) {
            console.error(error);
        }
    }

    async getGeocode(cityName) {
        try {
            const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${this._weatherApi}`);
            if (!response.ok) throw new Error("Weather API geocoding network error:" + response.statusText);
            const data = await response.json();

            const lat = data[0].lat;
            const lon = data[0].lon;
            const name = data[0].name;
            const country = data[0].country;

            return {lat, lon, name, country};
        } catch (error) {
            console.error(error);
        }
    }
}