import { msToHuman, convertToMs } from "../utils/timeUtils.js";

export class ReminderScheduler {
    constructor(chatService, db, commandPrefix="$") {
        this._chatService = chatService;
        this._db = db;
        this._commandPrefix = commandPrefix;
    }

    start() {
        setInterval(async () => {
            const now = Date.now();
    
            // Fetch due, undelivered reminders
            const reminders = this._db.prepare(`
                SELECT * FROM reminders
                WHERE delivered = 0 AND trigger_time <= ?
            `).all(now);
    
            // Send each reminder and mark as delivered
            for (const reminder of reminders) {
                let timeSinceSet = msToHuman(now - reminder.created_at)

                if (reminder.sender === reminder.target) {
                    await this._chatService.sendChatMessage(`${reminder.target}, reminder from yourself (${timeSinceSet} ago): ${reminder.message}`);
                } else {
                    await this._chatService.sendChatMessage(`${reminder.target}, reminder from ${reminder.sender} (${timeSinceSet} ago): ${reminder.message}`);
                }
    
                this._db.prepare(`
                    UPDATE reminders SET delivered = 1 WHERE id = ?
                `).run(reminder.id);
        
            }
        }, 10_000);
    }
    
    parseRemindCommand(messageText) {
        const firstPattern = new RegExp(`\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)`);
        const secondPattern = new RegExp(`\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+.+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)`)

        const match = messageText.match(firstPattern) || messageText.match(secondPattern);

        if (!match) {
            return "No match";
        }
        const targetUser = match[1] || "me";
        const time = match[2];
        const message = match[3];

        return {
            target: targetUser,
            time: time,
            message: message,
        }
    }

    async remindCommand(messageText, data) {
        let reminderDict = this.parseRemindCommand(messageText)
        if (reminderDict === "No match") {
            return;
        }
        
        let sender = data.payload.event.chatter_user_login.toLowerCase()
        let target = reminderDict["target"] === "me" ? data.payload.event.chatter_user_login.trim() : reminderDict["target"].toLowerCase()
        const currentTime = Date.now();
        const timeToTarget = convertToMs(reminderDict["time"])

        if (reminderDict["message"].length > 400) {
            return;
        }

        const insert = this._db.prepare(`
            INSERT INTO reminders (sender, target, message, trigger_time, created_at)
            VALUES (?,?,?,?,?)
        `);
        insert.run(
            sender,
            target,
            reminderDict["message"],
            currentTime + timeToTarget,
            currentTime
        )

        // Let the user know that a reminder has been set
        const timeUntil = msToHuman(timeToTarget)
        if (sender === target){
            await this._chatService.sendChatMessage(`${sender}, I will remind you in ${timeUntil}`)
        } else {
            await this._chatService.sendChatMessage(`${sender}, I will remind ${target} in ${timeUntil}`)
        }
    }
}