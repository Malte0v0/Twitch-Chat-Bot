import type { ChatDatabase } from "../../../chatDatabase.js";
import { getWeekNumber } from "../../../utils/timeUtils.js";
import type { Movie } from "../Movie.js";
import { toMovie } from "../MovieMapper.js";
import type { MovieRow } from "../MovieRow.js";
import type { NominationRepositoryPort } from "../ports/NominationRepositoryPort.js";

export class NominationRepository implements NominationRepositoryPort {
  constructor(private database: ChatDatabase) {}

  userNominatedThisWeek(userId: number) {
    const result = this.database
      .prepare<number[], { user_id: number }>(
        `SELECT user_id FROM weekly_movies
                WHERE user_id = ? AND week_num = ?
                `,
      )
      .get(userId, getWeekNumber());

    if (result?.user_id != null) {
      return true;
    }
    return false;
  }

  saveNomination(userId: number, omdbId: string) {
    this.database
      .prepare(
        `INSERT INTO weekly_movies (user_id, week_num, movie_id)
                SELECT ?,?, m.movie_id
                FROM movies m
                WHERE m.omdb_id = ?
                `,
      )
      .run(userId, getWeekNumber(), omdbId);
  }

  getWeeklyNominations(weekNum: number) {
    const rawMovies = this.database
      .prepare<
        string[],
        MovieRow
      >("SELECT * FROM movies m JOIN weekly_movies wm ON wm.movie_id = m.movie_id WHERE wm.week_num = ?")
      .all(weekNum.toString());

    let movies: Movie[] = [];

    for (const rawMovie of rawMovies) {
      movies.push(toMovie(JSON.parse(rawMovie.json), rawMovie.json));
    }

    return movies;
  }

  deleteNomination(userId: number, weekNum: number) {
    this.database
      .prepare("DELETE FROM weekly_movies WHERE user_id = ? AND week_num = ?")
      .run(userId, weekNum);
  }
}
