export class WeatherClient {
    constructor() {
        this.weatherApiKey = process.env.WEATHER_API;
    }

    async getWeather(cityName) {
        try {
            const geocode = await this.getGeocode(cityName);
            if (!geocode) {
                return;
            }
            const response = await fetch(
                `https://api.openweathermap.org/data/3.0/onecall?lat=${geocode.lat}&lon=${geocode.lon}&appid=${this.weatherApiKey}&units=metric`,
            );
            if (!response.ok)
                throw new Error("Network error:" + response.statusText);
            const data = await response.json();

            return [geocode, data];
        } catch (error) {
            console.warn(error);
        }
    }

    async getGeocode(cityName) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${this.weatherApiKey}`,
            );
            if (!response.ok)
                throw new Error(
                    "Weather API geocoding network error:" +
                        response.statusText,
                );
            const data = await response.json();

            const lat = data[0].lat;
            const lon = data[0].lon;
            const name = data[0].name;
            const country = data[0].country;

            return { lat, lon, name, country };
        } catch (error) {
            console.log("Could not find location " + cityName);
        }
    }
}
