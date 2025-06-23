import { ReminderScheduler } from "../schedulers/reminderScheduler.js";
import { StatusService } from "../services/statusService.js";
import { WeatherService } from "../services/weatherService.js";
import { msToHuman } from "../utils/timeUtils.js";

export class Commands {
    constructor(chatService, db) {
        this._chatService = chatService;

        this._reminderScheduler = new ReminderScheduler(chatService, db, commandPrefix);
        this._statusService = new StatusService(chatService, db, commandPrefix);
        this._weatherService = new WeatherService(commandPrefix, chatService);
    }

    async handleCommand(command, data) {
        switch (command) {
            case "remind": case "remindme":
                await this._reminderScheduler.remindCommand(messageText, data);
                break;
            case "weather":
                await this._weatherService.weatherCommand(messageText, data).catch(error => {
                    console.error("Weather command failed:", error);
                });
                break;
            case "afk":
                await this._statusService.setUserStatus(messageText, data, "afk");
                break;
            case "sleep":
                await this._statusService.setUserStatus(messageText, data, "sleep");
                break;
            default:
                console.warn("Unknown command,", command);
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
