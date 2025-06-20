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
        const weatherJson = await this.getWeather(cityName);

        const weather = weatherJson["main"];
        const temp = weather["temp"];
        const feelsLike = weather["feels_like"];
        const humidity = weather["humidity"];

        const clouds = weatherJson["clouds"]["all"]; // implement cloud emoji getting
        const windSpeed = weatherJson["wind"]["speed"]
        const city = weatherJson["name"];
        const country = weatherJson["sys"]["country"];
        const emoji = this.getWeatherEmoji(weatherJson);
        
        await this._chatService.sendChatMessage(`${sender}, ${city}, ${country} (now): ${emoji} ${temp}°C, feels like ${feelsLike}°C. Cloud cover: ${clouds}%. Wind speed: ${windSpeed} m/s. Humidity: ${humidity}%`)

    }

    getWeatherEmoji(weatherJson) {
        if (!weatherJson || !weatherJson.weather || !weatherJson.weather[0]) {
            return "❓";
        }

        const main = weatherJson.weather[0].main.toLowerCase();
        const id = weatherJson.weather[0].id;

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
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${this._weatherApi}&units=metric`);
            if (!response.ok) throw new Error("Network error:" + response.statusText);
            const data = await response.json()

            return data
        } catch (error) {
            console.error(error)
        }
    }
}