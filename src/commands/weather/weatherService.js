import { WeatherClient } from "./weatherClient.js";
import { WeatherParser } from "./weatherParser.js";
import { WeatherRepository } from "./weatherRepository.js";

export class WeatherService {
    constructor(chatService, database) {
        this.chatService = chatService;

        this.weatherRepository = new WeatherRepository(database);
        this.weatherClient = new WeatherClient();
        this.weatherParser = new WeatherParser();
    }

    async weatherCommand(messageText, userId, userName) {
        let cityName = null;

        if (messageText) {
            cityName = messageText;
        } else {
            cityName = this.weatherRepository.getLocation(userId);
        }

        if (!cityName) {
            await this.chatService.sendChatMessage(
                `@${userName}, Could not get location`,
            );
            return;
        }

        const result = await this.weatherClient.getWeather(cityName);
        if (!result) return;
        const [geocode, weatherJson] = result;

        if (!geocode || !weatherJson) {
            return;
        }

        const weather = this.weatherParser.parseWeatherJson(weatherJson);

        const city = geocode.name;
        const country = geocode.country;

        await this.chatService.sendChatMessage(
            `@${userName}, ${city}, ${country} (now): ${weather.emoji} ${weather.tempC}°C (${weather.tempF}°F), \
            feels like ${weather.feelsLikeC}°C (${weather.feelsLikeF}°F). \
            UV index: ${weather.uvi}. Cloud cover: ${weather.clouds}%. \
            Wind speed: ${weather.windSpeed} m/s. Humidity: ${weather.humidity}%. \
            Air pressure: ${weather.pressure} hPa. ${weather.alert}`,
        );
    }
}
