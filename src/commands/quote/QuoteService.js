export class QuoteService {
  constructor(getQuoteAdapter) {
    this.getQuoteAdapter = getQuoteAdapter;
  }

  async getRandomQuote() {
    const { quote, author } = await this.getQuoteAdapter.getQuote();
    return `"${quote}" - ${author}`;
  }
}
