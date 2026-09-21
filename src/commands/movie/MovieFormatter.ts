import type { Movie } from "./Movie.js";

const IMDB_URL = "imdb.com/title/";

export class MovieFormatter {
  static showMovie(movie: Movie) {
    return `${movie.title} (${movie.year}) - ${IMDB_URL + movie.imdbID}`;
  }

  static nominated(movie: Movie) {
    return `has nominated ${MovieFormatter.showMovie(movie)}`;
  }
}
