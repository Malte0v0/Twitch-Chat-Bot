export class ZenQuotesAdapter {
  constructor(apiURL) {
    this._apiURL = apiURL;
    this._quotesQueue = [];
  }

  async #fetchQuotesFromAPI() {
    const response = await fetch(this._apiURL);
    const data = await response.json();
    console.log("Fetched new quotes");
    return data;
  }

  async #refreshQueue() {
    const quotes = await this.#fetchQuotesFromAPI();
    if (Array.isArray(quotes)) {
      for (const quote of quotes) {
        this._quotesQueue.push(quote);
      }
    } else {
      this._quotesQueue.push(quotes);
    }
  }

  async getQuote() {
    if (this._quotesQueue.length === 0) {
      await this.#refreshQueue();
    }
    const quoteJson = this._quotesQueue.shift();
    return { quote: quoteJson.q, author: quoteJson.a };
  }
}