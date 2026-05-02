export class WeatherParser {
    parseWeatherJson(weatherJson) {
        const weather = weatherJson.current;

        const parsed = {
            tempC: weather.temp,
            tempF: ((weather.temp * 9) / 5 + 32).toFixed(2),
            feelsLikeC: weather.feels_like,
            feelsLikeF: ((weather.feels_like * 9) / 5 + 32).toFixed(2),
            pressure: weather.pressure,
            humidity: weather.humidity,
            uvi: weather.uvi,
            clouds: weather.clouds,
            windSpeed: weather.wind_speed,
            alert: weatherJson.alerts
                ? `⚠️ Alert: ${weatherJson.alerts.slice(-1)[0].event}`
                : "",
            emoji: this.getWeatherEmoji(weather.weather[0]),
        };

        return parsed;
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
}
