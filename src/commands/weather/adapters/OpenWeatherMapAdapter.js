import { parseWeatherJson } from "../WeatherParser.js";

export class OpenWeatherMapAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async getWeather(cityName) {
    const geocode = await this.#getGeocode(cityName);

    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${geocode.lat}&lon=${geocode.lon}&appid=${this.apiKey}&units=metric`,
    );

    if (!response.ok) throw new Error("Network error:" + response.statusText); // get proper error handling
    const weatherJson = await response.json();

    return {geocode, weather: parseWeatherJson(weatherJson)};
  }

  async #getGeocode(cityName) {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${this.apiKey}`,
      );
      if (!response.ok)
        throw new Error(
          "Weather API geocoding network error:" + response.statusText, // get proper error handling
        );
      const data = await response.json();

      const lat = data[0].lat;
      const lon = data[0].lon;
      const name = data[0].name;
      const country = data[0].country;

      return { lat, lon, name, country };
  }
}
