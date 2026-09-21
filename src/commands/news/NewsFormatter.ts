export function formatNews(timeSincePublished: string, title: string): string {
  return `(${timeSincePublished} ago) ${title}`;
}