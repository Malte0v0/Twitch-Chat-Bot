export function getOmdbIdFromUrl(url: string): string {
  const regex = /^(https?:\/\/)?(www\.)?imdb\.com\/title\/(\w+)\/?$/;
  const match = url.match(regex);
  if (!match || !match[3]) throw new Error();
  return match[3];
}
