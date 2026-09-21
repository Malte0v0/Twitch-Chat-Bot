import type { Movie } from "./Movie.js";

export function toMovie(
  json: {
    Title: string;
    Year: string;
    Released: string;
    Runtime: string;
    imdbID: string;
  },
  rawJson: string,
) {
  const result: Movie = {
    title: json.Title,
    year: parseInt(json.Year),
    releaseDate: new Date(json.Released),
    runtimeMinutes: parseInt(json.Runtime),
    imdbID: json.imdbID,
    legacyJson: rawJson,
  };

  return result;
}
