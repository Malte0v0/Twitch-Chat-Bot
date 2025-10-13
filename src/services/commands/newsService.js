import Parser from "rss-parser";
import { msToHuman, sleep } from "../../utils/timeUtils.js";

export class NewsService {
    constructor(commandPrefix, chatService) {
        this._commandPrefix = commandPrefix;
        this._chatService = chatService;

        this._parser = new Parser();
    }

    async newsCommand() {
        const newsData = await this.getNews();

        const articles = newsData.items;
        const topArticles = articles.slice(0, 1);

        for (const article of topArticles) {
            const title = article.title;

            const timePublished = new Date(article.isoDate);
            const currentTime = Date.now();
            const timeSincePublished = msToHuman(currentTime - timePublished);         

            await this._chatService.sendChatMessage(`(${timeSincePublished} ago) ${title}`);
            await sleep(2000);
        }

    }

    async getNews() {
        try {
            const data = await this._parser.parseURL(`https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen`);

            return data;
        } catch (error) {
            console.warn(error);
        }
    }
}