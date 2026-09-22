import YahooFinance from "yahoo-finance2";
import type { StockClientPort } from "../ports/StockClientPort.js";

const CURRENCY_LOOKUP: Record<string, string> = {
  USD: "$",
};

export class YahooFinanceAdapter implements StockClientPort {
  private yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  private getCurrencySymbol(currency: string): string {
    return CURRENCY_LOOKUP[currency] || currency + " ";
  }

  async getPriceInUSD(stock: string): Promise<string> {
    const results = await this.yahooFinance.search(stock);
    if (!results) throw new Error(`No results for stock ${stock}`);

    const firstQuote = results?.quotes?.[0]?.symbol;

    if (typeof firstQuote !== "string") {
      throw new Error(`No valid quote found for stock ${stock}`);
    }

    const quote = await this.yahooFinance.quote(firstQuote);

    const price: string = parseFloat(quote.regularMarketPrice).toFixed(2);

    return `${stock} ${this.getCurrencySymbol(quote.currency)}${price}`;
  }
}
