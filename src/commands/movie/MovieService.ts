import { getWeekNumber } from "../../utils/timeUtils.js";
import type { Movie } from "./Movie.js";
import type { NominationRepositoryPort } from "./ports/NominationRepositoryPort.js";
import { MovieFormatter } from "./MovieFormatter.js";
import type { GetMoviePort } from "./ports/GetMoviePort.js";

export class MovieService {
  constructor(
    private getMoviePort: GetMoviePort,
    private nominationRepository: NominationRepositoryPort,
  ) {}

  async nominateMovie(userId: number, omdbId: string) {
    if (this.nominationRepository.userNominatedThisWeek(userId))
      return "you have already nominated a movie this week";

    const movie: Movie = await this.getMoviePort.getMovie(omdbId);

    this.nominationRepository.saveNomination(userId, movie.imdbID);

    return MovieFormatter.nominated(movie);
  }

  getWeeklyNominationsMessage() {
    const movies =
      this.nominationRepository.getWeeklyNominations(getWeekNumber());
    if (movies.length == 0) {
      return ["No movies have been nominated this week"];
    }

    let message = ["This weeks nominated movies:"];
    let count = 0;
    for (const movie of movies) {
      count += 1;
      message.push(count + ". " + MovieFormatter.showMovie(movie));
    }

    return message;
  }

  removeMovieNomination(userId: number) {
    try {
      this.nominationRepository.deleteNomination(userId, getWeekNumber());
      return "your nomination has been removed";
    } catch (error) {
      return "you haven't nominated a movie yet";
    }
  }
}
