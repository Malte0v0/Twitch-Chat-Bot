export interface GetNewsPort {
  getNews(): Promise<{
    timeSincePublished: string,
    title: string,
  }>
}