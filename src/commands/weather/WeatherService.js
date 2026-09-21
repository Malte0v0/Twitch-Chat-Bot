import {
  formatCouldNotGetLocation,
  formatWeather,
} from "./WeatherFormatter.js";

export class WeatherService {
  constructor(locationRepository, weatherAdapter) {
    this.locationRepository = locationRepository;
    this.weatherAdapter = weatherAdapter;
  }

  async getWeatherFor(cityName, userId) {
    if (!cityName) {
      cityName = this.locationRepository.getLocation(userId);
    }

    if (!cityName) {
      return formatCouldNotGetLocation();
    }

    const { geocode, weather } = await this.weatherAdapter.getWeather(cityName);

    const city = geocode.name;
    const country = geocode.country;

    return formatWeather(city, country, weather);
  }
}
