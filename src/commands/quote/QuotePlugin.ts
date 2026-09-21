import type { QuoteService } from "./QuoteService.js";
import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";

export function createQuotePlugin(quoteService: QuoteService): CommandPlugin {
  const handleQuote: CommandHandler = async (_input, context) => {
    const quote = await quoteService.getRandomQuote();
    await context.chat.send(quote);
  };

  return {
    name: "quote",
    commands: [
      {
        name: "quote",
        aliases: ["q", "quotes"],
        handler: handleQuote,
      },
    ],
  };
}
