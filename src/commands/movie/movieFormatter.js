const IMDB_URL = "imdb.com/title/";

export class MovieFormatter {
    static showMovie(movie) {
        return `${movie.Title} (${movie.Year}) - ${IMDB_URL + movie.imdbID}`;
    }

    static nominated(movie) {
        return `has nominated ${MovieFormatter.showMovie(movie)}`;
    }
}
