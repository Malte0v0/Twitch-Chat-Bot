import { ReminderScheduler } from "../schedulers/reminderScheduler.js";
import { NewsService } from "../services/newsService.js";
import { QuotesService } from "../services/quotesService.js";
import { TimeService } from "../services/timeService.js";
import { StatusService } from "../services/statusService.js";
import { WeatherService } from "../services/weatherService.js";
import { msToHuman } from "../utils/timeUtils.js";

export class Commands {
    constructor(chatService, db, commandPrefix) {
        this._chatService = chatService;

        this._reminderScheduler = new ReminderScheduler(chatService, db, commandPrefix);
        this._statusService = new StatusService(chatService, db, commandPrefix);
        this._weatherService = new WeatherService(commandPrefix, db, chatService);
        this._newsService = new NewsService(commandPrefix, chatService);
        this._quotesService = new QuotesService(chatService);
        this._timeService = new TimeService(chatService);

        this._execute = this.debounce(this.executeCommand, 500);
    }

    async executeCommand(command, messageText, data) {
        switch (command) {
            case "remind": case "remindme":
                await this._reminderScheduler.remindCommand(messageText, data);
                break;
            case "unset":
                await this._reminderScheduler.unsetReminderCommand(messageText, data);
                break;
            case "weather": case "w":
                await this._weatherService.weatherCommand(messageText, data).catch(error => {
                    console.warn("Weather command failed:", error);
                });
                break;
            case "location":
                await this._weatherService.locationCommand(messageText, data);
                break;
            case "news":
                await this._newsService.newsCommand();
                break;
            case "afk":
                await this._statusService.setUserStatus(messageText, data, "afk");
                break;
            case "sleep":
                await this._statusService.setUserStatus(messageText, data, "sleep");
                break;
            case "quote":
                await this._quotesService.quoteCommand();
                break;
            case "time":
                await this._timeService.timeCommand();
                break;
            case "r1":
                break;
            case "gpt":
                break;
            default:
                console.warn("Unknown command,", command);
        }
    }

    async handleCommand(command, messageText, data) {
        this._execute(command, messageText, data);
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

    async handleOnSightDueReminders(data) {
        try {
            const dueOnSightReminders = this._reminderScheduler.dueOnSightReminders;
            
            const userLogin = data.payload.event.chatter_user_login;
            
            for (const reminder of dueOnSightReminders) {
                if (reminder.target === userLogin) {
                    this._reminderScheduler.sendReminder(reminder);
                }
            }

        } catch (error) {
            console.warn(error);
        }
    }

    async handleAfkAsleep(messageText, data) {
        try {
            const userId = data.payload.event.chatter_user_id;
            const userLogin = data.payload.event.chatter_user_login;
            const status = this._statusService.checkChatterStatus(userId);
            
            const asleepOrAfkUsers = this._statusService.getAfkOrAsleepUsernames();
            for (const user of asleepOrAfkUsers) {
                if (messageText.toLowerCase().startsWith(`@${user}`)) {
                    const asleepOrAfkUserStatus = this._statusService.checkChatterStatusByName(user);
                    if (asleepOrAfkUserStatus.isAfk) {
                        await this._chatService.sendChatMessage(`@${userLogin}, ${user} is currently AFK${asleepOrAfkUserStatus.message}`);
                    } else if (asleepOrAfkUserStatus.isAsleep) {
                        await this._chatService.sendChatMessage(`@${userLogin}, ${user} is currently sleeping${asleepOrAfkUserStatus.message}`);
                    }
                }
            }

            if (status && (status.isAfk || status.isAsleep)) {
                const timeSince = msToHuman(Date.now() - status.time); 
                
                if (status.isAfk) {
                    this._statusService.toggleAfkStatus(userId);
                    await this._chatService.sendChatMessage(`@${userLogin} is no longer AFK${status.message} (${timeSince})`);
                } else if (status.isAsleep) {
                    this._statusService.toggleAsleepStatus(userId);
                    await this._chatService.sendChatMessage(`@${userLogin} is no longer sleeping${status.message} (${timeSince})`);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
}
