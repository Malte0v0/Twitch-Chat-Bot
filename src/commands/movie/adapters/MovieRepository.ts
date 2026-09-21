import type { MovieRepositoryPort } from "../ports/MovieRepositoryPort.js";
import type { ChatDatabase } from "../../../chatDatabase.js";
import type { Movie } from "../Movie.js";
import type { MovieRow } from "../MovieRow.js";
import { MovieNotFoundError } from "../errors/MovieNotFoundError.js";
import { toMovie } from "../MovieMapper.js";

export class MovieRepository implements MovieRepositoryPort {
  constructor(private database: ChatDatabase) {}

  getMovieByOMDBId(omdbId: string): Movie {
    const result = this.database
      .prepare<string[], MovieRow>("SELECT * FROM movies WHERE omdb_id = ?")
      .get(omdbId);

    if (!result) throw new MovieNotFoundError();

    const movie: Movie = toMovie(JSON.parse(result.json), result.json);

    return movie;
  }

  getAllMovies(): Movie[] {
    const rows = this.database
      .prepare<string[], MovieRow>("SELECT * FROM movies")
      .all();

    let movies: Movie[] = [];

    for (const row of rows) {
      const movie = toMovie(JSON.parse(row.json), row.json);
      movies.push(movie);
    }

    return movies;
  }

  saveMovie(movie: Movie, legacyJson: string): void {
    const result = this.database
      .prepare("INSERT OR IGNORE INTO movies (omdb_id, json) VALUES (?,?)")
      .run(movie.imdbID, JSON.stringify(legacyJson));

    if (!result) throw new Error();
  }
}
