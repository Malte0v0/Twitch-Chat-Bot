export class QuotesService {
    constructor(chatService) {
        this._chatService = chatService;

        this._randomQuotesApiUrl = "https://zenquotes.io/api/quotes";
        this._quotesQueue = []; 
    }

    async _getJSON(url) {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Fetched new quotes");
        return data;
    }

    async _refreshQueue() {
        const quotes = await this._getJSON(this._randomQuotesApiUrl);
        if (Array.isArray(quotes)) {
            for (const quote of quotes) {
                this._quotesQueue.push(quote);
            }
        } else {
            this._quotesQueue.push(quotes);
        }
    }

    async _getQuote() {
        if (this._quotesQueue.length === 0) {
            await this._refreshQueue();
        }
        const quoteJson = this._quotesQueue.shift();
        return quoteJson;
    }

    async quoteCommand() {
        try {
            const quoteJson = await this._getQuote();
            const quote = quoteJson.q;
            const author = quoteJson.a;

            await this._chatService.sendChatMessage(`"${quote}" - ${author}`);
        } catch (error) {
            this._chatService.sendChatMessage("Unable to fetch quote")
            console.warn(error);
        }
    }
}