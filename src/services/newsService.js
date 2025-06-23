import { msToHuman, sleep } from "../utils/timeUtils.js";

export class NewsService {
    constructor(commandPrefix, chatService) {
        this._commandPrefix = commandPrefix;
        this._chatService = chatService;

        this._newsApi = process.env.NEWS_API;

        this._allowedSources = ["abc-news", "cnn", "the-wall-street-journal", "nbc-news", "associated-press", "reuters", "fox-news",
            "the-washington-post", 
        ];
        this._pageSize = "10";
    }

    async newsCommand() {
        const newsData = await this.getNews();

        const articles = newsData.articles;
        // const articles = [];
        // for (const article of newsData.articles) {
        //     if (this._allowedSources.includes(article.source.id)) {
        //         articles.push(article);
        //     }
        // }
        const topArticles = articles.slice(0, 1);

        for (const article of topArticles) {
            const source = article.source.name;
            const title = article.title;
            const description = article.description;
            const url = article.url;

            const timePublished = new Date(article.publishedAt);
            const currentTime = Date.now();
            const timeSincePublished = msToHuman(currentTime - timePublished);         

            await this._chatService.sendChatMessage(`(${timeSincePublished} ago) ${source} - ${title} ${url}`);
            await sleep(2000);
        }

    }

    async getNews() {
        try {
            const response = await fetch(`https://gnews.io/api/v4/top-headlines?category=world&country=us&apikey=${this._newsApi}`);
            if (!response.ok) throw new Error("Network error:" + response.statusText);
            const data = await response.json();

            return data;
        } catch (error) {
            console.warn(error);
        }
    }
}