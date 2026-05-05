import { ReminderService } from "./commands/reminder/reminderService.js";
import { WeatherService } from "./commands/weather/weatherService.js";
import { LocationService } from "./commands/location/locationService.js";
import { NewsService } from "./commands/news/newsService.js";
import { AwayService } from "./commands/away/awayService.js";
import { QuotesService } from "./commands/quote/quotesService.js";
import { TimeService } from "./commands/time/timeService.js";
import { AWAY_STATUS } from "./commands/away/awayStatus.js";
import { UserService } from "./user/userService.js";
import { MovieService } from "./commands/movie/movieService.js";

export class CommandController {
    constructor(chatService, database, scheduler) {
        this.chatService = chatService;
        this.database = database;
        this.scheduler = scheduler;

        const userService = new UserService(database);
        userService.startListening();
        const userRepository = userService.getUserRepository();

        this.reminderService = new ReminderService(
            chatService,
            userRepository,
            database,
            scheduler,
        );
        this.reminderService.startListening();
        this.weatherService = new WeatherService(chatService, database);
        this.locationService = new LocationService(chatService, database);
        this.newsService = new NewsService(chatService);
        this.awayService = new AwayService(chatService, database);
        this.awayService.start();
        this.quotesService = new QuotesService(chatService);
        this.timeService = new TimeService(chatService);

        this.movieSerivce = new MovieService(database, chatService);
        this.movieSerivce.init();

        this.execute = this.debounce(this.executeCommand, 500);
    }

    async executeCommand(command, messageText, data) {
        const userId = data.payload.event.chatter_user_id;
        const userLogin = data.payload.event.chatter_user_login;
        const userName = data.payload.event.chatter_user_name;

        switch (command) {
            case "remind":
            case "remindme":
                this.reminderService.create(
                    userId,
                    (command + " " + messageText).trim(),
                );
                break;
            case "unset":
                this.reminderService.delete(userLogin, userId, messageText);
                break;
            case "printreminders":
                this.reminderService.print();
                break;
            case "weather":
            case "w":
                await this.weatherService
                    .weatherCommand(messageText, userId, userName)
                    .catch((error) => {
                        console.warn("Weather command failed:", error);
                    });
                break;
            case "location":
                await this.locationService.locationCommand(
                    messageText,
                    userId,
                    userName,
                );
                break;
            case "news":
                await this.newsService.newsCommand();
                break;
            case "afk":
                await this.awayService.setAway(
                    messageText,
                    userId,
                    userLogin,
                    AWAY_STATUS.afk,
                );
                break;
            case "sleep":
                await this.awayService.setAway(
                    messageText,
                    userId,
                    userLogin,
                    AWAY_STATUS.asleep,
                );
                break;
            case "shower":
                await this.awayService.setAway(
                    messageText,
                    userId,
                    userLogin,
                    AWAY_STATUS.showering,
                );
                break;
            case "quote":
                await this.quotesService.quoteCommand();
                break;
            case "time":
                await this.timeService.timeCommand();
                break;
            case "nominate":
                this.movieSerivce.nominateCommand(
                    userId,
                    userName,
                    messageText,
                );
                break;
            case "movies":
                this.movieSerivce.moviesCommand();
                break;
            case "unsetmovie":
                this.movieSerivce.unsetNominationCommand(userId, userName);
                break;
        }
    }

    async handleCommand(command, messageText, data) {
        this.execute(command, messageText, data);
    }

    debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
}
