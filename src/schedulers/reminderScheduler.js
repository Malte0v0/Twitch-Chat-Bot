import { msToHuman, convertToMs } from "../utils/timeUtils.js";

const MAX_32_BIT = 2147483647;

export class ReminderScheduler {
    constructor(chatService, db, commandPrefix="$") {
        this._chatService = chatService;
        this._db = db;
        this._commandPrefix = commandPrefix;

        this._timeouts = [];
    }

    start() {
        this._timeouts.forEach((timeout) => {clearTimeout(timeout)});

        this._reminders = this.undeliveredReminders;

        const now = Date.now();

        this._reminders.forEach((reminder) => {
            const delay = reminder.trigger_time - now;
            if (delay <= 0) {
                this.sendReminder(reminder)
                    .catch((error) => {console.error(error)});
                return;
            }

            this.scheduleReminder(delay, reminder);
        });
    }

    scheduleReminder(delay, reminder) {
        const timeout = setTimeout(async () => {
            if (delay > MAX_32_BIT) {
                this.scheduleReminder(delay - MAX_32_BIT, reminder);
            } else {
                try {
                    await this.sendReminder(reminder);
                } catch (error) {
                    console.error(error);
                }
            }

        }, Math.min(delay, MAX_32_BIT));
        this._timeouts.push(timeout);
    }

    async sendReminder(reminder) {
        const now = Date.now();
        const delay = reminder.trigger_time - now;
        if (delay > 0) {
            return;
        }

        if (reminder.message !== "") {
            reminder.message = ": " + reminder.message;
        }

        let timeSinceSet = msToHuman(now - reminder.created_at)
        if (reminder.sender === reminder.target) {
            await this._chatService.sendChatMessage(`@${reminder.target}, reminder from yourself (${timeSinceSet} ago)${reminder.message}`);
        } else {
            await this._chatService.sendChatMessage(`@${reminder.target}, reminder from ${reminder.sender} (${timeSinceSet} ago)${reminder.message}`);
        }

        this.setReminderDelivered(reminder);
    }

    get undeliveredReminders() {
        return this._db.prepare(`
            SELECT * FROM reminders
            WHERE delivered = 0
        `).all();
    }

    setReminderDelivered(reminder) {
        this._db.prepare(`
            UPDATE reminders SET delivered = 1 WHERE id = ?
        `).run(reminder.id);
    }
    
    parseRemindCommand(messageText) {
        const firstPattern = new RegExp(`\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)`);
        const secondPattern = new RegExp(`\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+(.+)in\\s+((?:\\d+\\s*\\w+\\s*)+)`);
        const thirdPatternNoMessage = new RegExp(`\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)`)

        "\$remind(?:me|\s+(\w+))\s+in\s+((?:\d+\s*\w+\s*)+)"

        let match;
        let time, message;

        if (match = messageText.match(firstPattern)) {
            time = match[2];
            message = match[3];
        } else if (match = messageText.match(secondPattern)) {
            time = match[3];
            message = match[2]
        } else if (match = messageText.match(thirdPatternNoMessage)) {
            time = match[2];
            message = "";
        }

        if (!match) {
            return "No match";
        }

        message = message === undefined ? "" : message;

        const targetUser = match[1] || "me";

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
        const result = insert.run(
            sender,
            target,
            reminderDict["message"],
            currentTime + timeToTarget,
            currentTime
        )
        
        const reminder = {
            id: result.lastInsertRowid,
            sender,
            target,
            message: reminderDict.message,
            trigger_time: currentTime + timeToTarget,
            created_at: currentTime,
        }

        this.scheduleReminder(timeToTarget, reminder);

        // Let the user know that a reminder has been set
        const timeUntil = msToHuman(timeToTarget)
        if (sender === target){
            await this._chatService.sendChatMessage(`@${sender}, I will remind you in ${timeUntil}`)
        } else {
            await this._chatService.sendChatMessage(`@${sender}, I will remind ${target} in ${timeUntil}`)
        }
    }
}