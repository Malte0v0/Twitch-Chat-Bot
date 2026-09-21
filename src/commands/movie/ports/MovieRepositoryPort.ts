import type { Movie } from "../Movie.js";

export interface MovieRepositoryPort {
  getMovieByOMDBId(omdbId: string): Movie;
  getAllMovies(): Movie[];
  saveMovie(movie: Movie, legacyJson: string): void;
}
