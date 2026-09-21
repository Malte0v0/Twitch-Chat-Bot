import type { Movie } from "../Movie.js";
import { toMovie } from "../MovieMapper.js";
import type { GetMoviePort } from "../ports/GetMoviePort.js";

export class OmdbMovieAdapter implements GetMoviePort {
  constructor(private apiBaseURL: string) {}

  async getMovie(omdbId: string): Promise<Movie> {
    const response = await fetch(this.apiBaseURL + omdbId);

    const json = await response.json();

    return toMovie(json, JSON.stringify(json));
  }
}
