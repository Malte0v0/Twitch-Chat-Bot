import { getWeekNumber } from "../../utils/timeUtils.js";
import { MovieClient } from "./movieClient.js";
import { MovieFormatter } from "./movieFormatter.js";
import { MovieParser } from "./movieParser.js";
import { MovieRepository } from "./movieRepository.js";
import { AlreadyNominatedError } from "../../errors/errors.js";
import { UserHasntNominatedError } from "../../errors/errors.js";

const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;

export class MovieService {
    constructor(database, chatService) {
        this.chatService = chatService;

        this.movieRepository = new MovieRepository(database);
        this.movieClient = new MovieClient(this.movieRepository);
    }

    init() {
        this.movieClient.loadToCacheFromDatabase();
        this.startInterval();
    }

    startInterval() {
        const now = new Date();
        const target = new Date();
        target.setUTCHours(19, 0, 0, 0);

        if (target <= now) target.setUTCDate(target.getUTCDate() + 1);

        const msUntil8pmUTC = target - now;

        setTimeout(() => {
            this.moviesCommand();
            setInterval(() => {
                this.moviesCommand();
            }, TWELVE_HOURS_IN_MS);
        }, msUntil8pmUTC);
    }

    nominateCommand(userId, userName, messageText) {
        const omdbId = MovieParser.getIdFromUrl(messageText);
        this.movieClient
            .fetchWithCacheByMovieId(omdbId)
            .then((movie) => {
                this.movieRepository.insertMovieNomination(
                    userId,
                    getWeekNumber(),
                    omdbId,
                );
                this.chatService.sendFormattedMessage(
                    userName,
                    MovieFormatter.nominated(movie.json),
                );
            })
            .catch((error) => {
                if (error instanceof AlreadyNominatedError) {
                    this.chatService.sendFormattedMessage(
                        userName,
                        "you already nominated a movie this week",
                    );
                } else {
                    console.error(error);
                }
            });
    }

    moviesCommand() {
        const rawWeekMovies =
            this.movieRepository.getWeeklyMovieNominations(getWeekNumber());

        if (rawWeekMovies.length == 0) {
            this.chatService.sendMessage(
                "No movies have been nominated this week",
            );
            return;
        }

        this.chatService.sendMessage("This weeks nominated movies:");

        let count = 0;
        for (const rawWeekMovie of rawWeekMovies) {
            count += 1;
            const movie = JSON.parse(rawWeekMovie.json);
            this.chatService.sendMessage(
                count + ". " + MovieFormatter.showMovie(movie),
            );
        }
    }

    unsetNominationCommand(userId, userName) {
        try {
            this.movieRepository.removeWeeklyMovieNomination(
                userId,
                getWeekNumber(),
            );
            this.chatService.sendFormattedMessage(
                userName,
                "your nomination has been removed",
            );
        } catch (error) {
            if (error instanceof UserHasntNominatedError) {
                this.chatService.sendFormattedMessage(
                    userName,
                    "you haven't nominated a movie yet",
                );
            }
        }
    }
}
