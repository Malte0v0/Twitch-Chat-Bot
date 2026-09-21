import type { StockClientPort } from "./ports/StockClientPort.js";

export class StockService {
  constructor(private stockClient: StockClientPort) {}

  async getPriceInUSD(stock: string): Promise<string> {
    try {
      const price: string = await this.stockClient.getPriceInUSD(stock);
      return price;
    } catch (error) {
      return `could not get price for ${stock.toUpperCase()}`;
    }
  }
}
