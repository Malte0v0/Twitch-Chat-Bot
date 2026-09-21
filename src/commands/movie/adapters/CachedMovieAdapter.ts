import type { GetMoviePort } from "../ports/GetMoviePort.js";
import type { MovieRepositoryPort } from "../ports/MovieRepositoryPort.js";
import type { Movie } from "../Movie.js";
import { toMovie } from "../MovieMapper.js";

export class CachedMovieAdapter implements GetMoviePort {
  private cache: Map<string, Movie> = new Map();

  constructor(
    private getMoviePort: GetMoviePort,
    private movieRepository: MovieRepositoryPort,
  ) {}

  loadToCacheFromRepository() {
    const rawMovies = this.movieRepository.getAllMovies();

    for (const rawMovie of rawMovies) {
      const movie: Movie = toMovie(
        JSON.parse(rawMovie.legacyJson),
        rawMovie.legacyJson,
      );

      this.cache.set(rawMovie.imdbID, movie);
    }
  }

  async fetchById(omdbId: string): Promise<Movie> {
    const movie = await this.getMoviePort.getMovie(omdbId);

    this.cache.set(movie.imdbID, movie);
    this.movieRepository.saveMovie(movie, movie.legacyJson);

    return movie;
  }

  async getMovie(omdbId: string): Promise<Movie> {
    if (this.cache.has(omdbId)) {
      const movie = this.cache.get(omdbId);
      if (!movie) throw new Error();
      return movie;
    }
    return await this.fetchById(omdbId);
  }
}
