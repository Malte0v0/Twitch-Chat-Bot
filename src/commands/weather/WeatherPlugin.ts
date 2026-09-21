import type { WeatherService } from "./WeatherService.js";
import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";

export function createWeatherPlugin(
  weatherService: WeatherService,
): CommandPlugin {
  const handleWeather: CommandHandler = async (input, context) => {
    const weather = await weatherService.getWeatherFor(
      input.args,
      input.user.id,
    );
    await context.chat.replyTo(input.user.name, weather);
  };

  return {
    name: "weather",
    commands: [
      {
        name: "weather",
        aliases: ["w"],
        handler: handleWeather,
      },
    ],
  };
}
