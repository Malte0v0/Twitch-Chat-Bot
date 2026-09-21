import type { Movie } from "../Movie.js";

export interface GetMoviePort {
  getMovie(omdbId: string): Promise<Movie>;
}
