import { WeatherClient } from "./weatherClient";
import { WeatherParser } from "./weatherParser";
import { WeatherRepository } from "./weatherRepository";

export class WeatherService {
    constructor(chatService, database) {
        this.chatService = chatService;

        this.weatherRepository = new WeatherRepository(database);
        this.weatherClient = new WeatherClient();
        this.weatherParser = new WeatherParser();

        this.weatherApi = process.env.WEATHER_API;
    }

    async weatherCommand(messageText, userId) {
        if (messageText) {
            const cityName = messageText;
        } else {
            const cityName = this.weatherRepository.getLocation(userId);
        }

        console.log(cityName);

        const [geocode, weatherJson] =
            await this.weatherClient.getWeather(cityName);

        if (!geocode || !weatherJson) {
            return;
        }

        const weather = this.weatherParser.parseWeatherJson(weatherJson);

        const city = geocode.name;
        const country = geocode.country;

        await this.chatService.sendChatMessage(
            `@${sender}, ${city}, ${country} (now): ${weather.emoji} ${weather.tempC}°C (${weather.tempF}°F), \
            feels like ${weather.feelsLikeC}°C (${weather.feelsLikeF}°F). \
            UV index: ${weather.uvi}. Cloud cover: ${weather.clouds}%. \
            Wind speed: ${weather.windSpeed} m/s. Humidity: ${weather.humidity}%. \
            Air pressure: ${weather.pressure} hPa. ${weather.alert}`,
        );
    }
}
