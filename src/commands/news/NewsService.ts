import { formatNews } from "./NewsFormatter.js";
import type { GetNewsPort } from "./ports/GetNewsPort.js";

export class NewsService {
  constructor(private getNewsPort: GetNewsPort) {}

  async getRecentNews(): Promise<string> {
    const { timeSincePublished, title } = await this.getNewsPort.getNews();
    return formatNews(timeSincePublished, title);
  }
}
