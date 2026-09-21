import Parser from "rss-parser";
import { msToHuman } from "../../../utils/timeUtils.js";
import type { GetNewsPort } from "../ports/GetNewsPort.js";

export class GoogleNewsAdapter implements GetNewsPort {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  async getNews(): Promise<{
    timeSincePublished: string;
    title: string;
  }> {
    const data = await this.parser.parseURL(
      `https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen`,
    );

    const topArticle = data.items[0];

    const title = topArticle?.title ?? "";
    const timePublished = new Date(topArticle?.isoDate ?? "");
    const timeSincePublished = msToHuman(Date.now() - timePublished.getTime());

    return { timeSincePublished: timeSincePublished, title: title };
  }
}
