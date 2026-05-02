import { NewsService } from "../services/commands/newsService.js";
import { QuotesService } from "../services/commands/quotesService.js";
import { StatusService } from "../services/commands/statusService.js";
import { ReminderService } from "../services/commands/reminderService.js";
import { TimeService } from "../services/commands/timeService.js";
import { WeatherService } from "../services/commands/weatherService.js";
import { AWAY_STATUS } from "./utils/awayStatus.js";

export class CommandController {
    constructor(chatService, db, scheduler, commandPrefix = "$") {
        this.chatService = chatService;
        this.db = db;
        this.scheduler = scheduler;
        this.commandPrefix = commandPrefix;

        this.reminderService = new ReminderService(db, scheduler);
        this.statusService = new StatusService(chatService, db, commandPrefix);
        this.weatherService = new WeatherService(
            commandPrefix,
            db,
            chatService,
        );
        this.newsService = new NewsService(commandPrefix, chatService);
        this.quotesService = new QuotesService(chatService);
        this.timeService = new TimeService(chatService);

        this.execute = this.debounce(this.executeCommand, 500);
    }

    async executeCommand(command, messageText, data) {
        switch (command) {
            case "remind":
            case "remindme":
                this.reminderService.createReminder(data);
                break;
            case "unset":
                this.reminderService.deleteReminder(data);
                break;
            case "printreminders":
                this.reminderService.printReminders();
                break;
            case "weather":
            case "w":
                await this.weatherService
                    .weatherCommand(messageText, data)
                    .catch((error) => {
                        console.warn("Weather command failed:", error);
                    });
                break;
            case "location":
                await this.weatherService.locationCommand(messageText, data);
                break;
            case "news":
                await this.newsService.newsCommand();
                break;
            case "afk":
                await this.statusService.setUserStatus(
                    messageText,
                    data,
                    AWAY_STATUS.afk,
                );
                break;
            case "sleep":
                await this.statusService.setUserStatus(
                    messageText,
                    data,
                    AWAY_STATUS.asleep,
                );
                break;
            case "shower":
                await this.statusService.setUserStatus(
                    messageText,
                    data,
                    AWAY_STATUS.showering,
                );
                break;
            case "quote":
                await this.quotesService.quoteCommand();
                break;
            case "time":
                await this.timeService.timeCommand();
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
