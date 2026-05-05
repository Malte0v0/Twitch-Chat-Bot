import { AlreadyNominatedError } from "../../errors/errors.js";
import { UserHasntNominatedError } from "../../errors/errors.js";

export class MovieRepository {
    constructor(database) {
        this.database = database;
    }

    getMovieByOMDBId(omdbId) {
        const result = this.database
            .prepare("SELECT * FROM movies WHERE omdb_id = ?")
            .get(omdbId);

        if (!result) return;

        return result;
    }

    getAllMovies() {
        const result = this.database.prepare("SELECT * FROM movies").all();

        if (!result) return;

        return result;
    }

    insertMovie(omdbId, json) {
        const result = this.database
            .prepare("INSERT INTO movies (omdb_id, json) VALUES (?,?)")
            .run(omdbId, JSON.stringify(json));

        if (!result) return;

        return result;
    }

    hasNominated(userId) {
        const result = this.database
            .prepare(
                `SELECT user_id FROM weekly_movies
                WHERE user_id = ?
                `,
            )
            .get(userId);

        if (result?.user_id != null) {
            return true;
        }
        return false;
    }

    insertMovieNomination(userId, weekNum, omdbId) {
        if (this.hasNominated(userId))
            throw new AlreadyNominatedError("User already nominated");
        const result = this.database
            .prepare(
                `INSERT INTO weekly_movies (user_id, week_num, movie_id)
                SELECT ?,?, m.movie_id
                FROM movies m
                WHERE m.omdb_id = ?
                `,
            )
            .run(userId, weekNum, omdbId);

        if (result.changes === 0) {
            throw "Could not insert movie";
        }

        return result;
    }

    getWeeklyMovieNominations(weekNum) {
        const result = this.database
            .prepare(
                "SELECT * FROM movies m JOIN weekly_movies wm ON wm.movie_id = m.movie_id WHERE wm.week_num = ?",
            )
            .all(weekNum);

        if (!result) return;

        return result;
    }

    removeWeeklyMovieNomination(userId, weekNum) {
        const result = this.database
            .prepare(
                "DELETE FROM weekly_movies WHERE user_id = ? AND week_num = ?",
            )
            .run(userId, weekNum);

        if (result.changes == 0) {
            throw new UserHasntNominatedError("User hasnt nominated a movie");
        }

        return result;
    }
}
