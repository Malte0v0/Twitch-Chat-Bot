import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";
import type { TimeService } from "./TimeService.js";

export function createTimePlugin(timeService: TimeService): CommandPlugin {
  const handleTime: CommandHandler = async (_input, context) => {
    for (const msg of timeService.timeCommand()) {
      await context.chat.send(msg);
    }
  };

  return {
    name: "time",
    commands: [
      {
        name: "time",
        aliases: ["t"],
        handler: handleTime,
      },
    ],
  };
}
