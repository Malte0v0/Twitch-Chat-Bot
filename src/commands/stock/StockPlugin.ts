import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";
import type { StockService } from "./StockService.js";

export function createStockPlugin(stockService: StockService): CommandPlugin {
  const handleStock: CommandHandler = async (input, context) => {
    const price = await stockService.getPriceInUSD(input.args);
    context.chat.replyTo(input.user.name, price);
  };

  return {
    name: "stock",
    commands: [
      {
        name: "stock",
        aliases: ["stocks", "s"],
        handler: handleStock,
      },
    ],
  };
}
