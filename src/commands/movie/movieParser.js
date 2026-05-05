export class MovieParser {
    static getIdFromUrl(url) {
        const regex = /^(https:\/\/)?(www\.)?imdb\.com\/title\/(\w+)\/?$/;
        const match = url.match(regex);
        if (!match) return null;
        return match[3];
    }
}
