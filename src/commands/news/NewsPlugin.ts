import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";
import type { NewsService } from "./NewsService.js";

export function createNewsPlugin(newsService: NewsService): CommandPlugin {
  const handleNews: CommandHandler = async (_input, context) => {
    const message = await newsService.getRecentNews();
    await context.chat.send(message);
  };

  return {
    name: "news",
    commands: [
      {
        name: "news",
        handler: handleNews,
      },
    ],
  };
}
