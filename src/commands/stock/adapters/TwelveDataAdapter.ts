import type { StockClientPort } from "../ports/StockClientPort.js";

export class TwelveDataAdapter implements StockClientPort {
  private apiBaseURL: string = "https://api.twelvedata.com";

  constructor(private apiKey: string) {}

  private async fetchPrice(stock: string) {
    const response = await fetch(
      `${this.apiBaseURL}/price?symbol=${stock}&apikey=${this.apiKey}`,
    );

    const json = await response.json();

    if (!json) throw new Error(`Could not fetch price for ${stock}`);

    const price = json?.price;

    if (!price) throw new Error(`No price for ${stock}`);

    return price;
  }

  async getPriceInUSD(stock: string): Promise<string> {
    const stockUpperCase = stock.toUpperCase();

    const price = await this.fetchPrice(stockUpperCase);

    return `${stockUpperCase} $${price}`;
  }
}
