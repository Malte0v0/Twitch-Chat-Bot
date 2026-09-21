export interface StockClientPort {
  getPriceInUSD(stock: string): Promise<string>;
}
