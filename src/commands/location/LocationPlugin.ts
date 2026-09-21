import type {
  CommandPlugin,
  CommandHandler,
} from "../../core/CommandPlugin.js";
import type { LocationService } from "./LocationService.js";

export function createLocationPlugin(
  locationService: LocationService,
): CommandPlugin {
  const handleLocation: CommandHandler = async (input, context) => {
    const response = locationService.setLocation(input.args, input.user.id);
    await context.chat.replyTo(input.user.name, response);
  };

  return {
    name: "location",
    commands: [
      {
        name: "location",
        handler: handleLocation,
      },
    ],
  };
}
