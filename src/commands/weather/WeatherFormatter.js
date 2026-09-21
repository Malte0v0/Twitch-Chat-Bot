export function formatCouldNotGetLocation(userName) {
  return `Could not get location`;
}

export function formatWeather(city, country, weather) {
  return `${city}, ${country} (now): ${weather.emoji} ${weather.tempC}°C (${weather.tempF}°F), \
          feels like ${weather.feelsLikeC}°C (${weather.feelsLikeF}°F). \
          UV index: ${weather.uvi}. Cloud cover: ${weather.clouds}%. \
          Wind speed: ${weather.windSpeed} m/s. Humidity: ${weather.humidity}%. \
          Air pressure: ${weather.pressure} hPa. ${weather.alert}`;
}
