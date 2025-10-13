import { msToHuman, convertToMs } from "../utils/timeUtils.js";

const MAX_32_BIT = 2147483647;

export class ReminderScheduler {
    constructor(chatService, db, commandPrefix="$") {
        this._chatService = chatService;
        this._db = db;
        this._commandPrefix = commandPrefix;

        this._timeouts = [];
        this._reminders = null;
        this._onSightReminders = null;

        // Start the scheduler
        this.start();
    }

    start() {
        this._timeouts.forEach((timeout) => {clearTimeout(timeout)});

        this._reminders = this.undeliveredReminders;
        this._onSightReminders = this.dueOnSightReminders;

        const now = Date.now();

        this._reminders.forEach((reminder) => {
            const delay = reminder.trigger_time - now;
            if (delay <= 0) {
                this.sendReminder(reminder)
                    .catch((error) => {console.error(error)});
            } else {
                this.scheduleReminder(delay, reminder);
            }

        });
    }

    scheduleReminder(delay, reminder) {
        this.removeFromArray(this._reminders, reminder);
        this._reminders.push(reminder);

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

    scheduleOnSightReminder(reminder) {
        this.removeFromArray(this._onSightReminders, reminder);
        this._onSightReminders.push(reminder);
    }

    removeFromArray(variable, item) {
        const index = variable.indexOf(item);
        if (index > -1) variable.splice(index, 1);
    }

    async sendReminder(reminder) {
        const now = Date.now();

        let delay;
        if (reminder.trigger_time) {
            delay = reminder.trigger_time - now;
        }
        if (delay && delay > 0) {
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
            AND trigger_time IS NOT NULL
        `).all();
    }

    get dueOnSightReminders() {
        return this._db.prepare(`
            SELECT * FROM reminders
            WHERE delivered = 0
            AND trigger_time IS NULL
            `).all();
    }

    setReminderDelivered(reminder) {
        this.removeFromArray(this._reminders, reminder);
        this.removeFromArray(this._onSightReminders, reminder);
        this._db.prepare(`
            UPDATE reminders SET delivered = 1 WHERE id = ?
        `).run(reminder.id);
    }
    
    parseRemindCommand(messageText) {
        const firstPattern = new RegExp(`^\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)$`)
        const secondPattern = new RegExp(`^\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+(.+)in\\s+((?:\\d+\\s*\\w+\\s*)+)$`);
        const thirdPatternNoMessage = new RegExp(`^\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)$`);
        const fourthPatternNoTime = new RegExp(`^\\${this._commandPrefix}remind(?:me|\\s+(\\w+))\\s+(.+)$`);

        let match;
        let time = null;
        let message = null;

        if (match = messageText.match(firstPattern)) {
            time = match[2];
            message = "";
        } else if (match = messageText.match(secondPattern)) {
            time = match[3];
            message = match[2]
        } else if (match = messageText.match(thirdPatternNoMessage)) {
            time = match[2];
            message = match[3];
        } else if (match = messageText.match(fourthPatternNoTime)) {
            message = match[2];
        }

        if (!match) {
            return false;
        }

        if (!message) message = "";

        const targetUser = match[1] || "me";

        return {
            target: targetUser,
            time: time,
            message: message,
        }
    }

    async remindCommand(messageText, data) {
        let reminderDict = this.parseRemindCommand(messageText)
        if (!reminderDict) {
            return;
        }
        
        let sender = data.payload.event.chatter_user_login.toLowerCase()
        let target = reminderDict.target === "me" ? data.payload.event.chatter_user_login.trim() : reminderDict.target.toLowerCase()
        const currentTime = Date.now();

        let triggerTime = null;
        let timeToTarget = null;
        if (reminderDict.time) {
            timeToTarget = convertToMs(reminderDict.time)
            triggerTime = currentTime + timeToTarget;
        }

        if (reminderDict.message.length > 400) {
            return;
        }

        const insert = this._db.prepare(`
            INSERT INTO reminders (sender, target, message, trigger_time, created_at)
            VALUES (?,?,?,?,?)
        `);
        const result = insert.run(
            sender,
            target,
            reminderDict.message,
            triggerTime,
            currentTime
        );
        const rowId = result.lastInsertRowid;
        
        const reminder = {
            id: rowId,
            sender,
            target,
            message: reminderDict.message,
            trigger_time: triggerTime,
            created_at: currentTime,
        }

        // Regular reminders
        if (reminderDict.time) {
            const timeUntil = msToHuman(timeToTarget);
            this.scheduleReminder(timeToTarget, reminder);
            // Let the user know that a reminder has been set
            if (sender === target){
                await this._chatService.sendChatMessage(`@${sender}, I will remind you in ${timeUntil} (ID ${rowId})`);
            } else {
                await this._chatService.sendChatMessage(`@${sender}, I will remind ${target} in ${timeUntil} (ID ${rowId})`);
            }
        } else { // On sight reminders
            this.scheduleOnSightReminder(reminder);
            if (sender === target){
                await this._chatService.sendChatMessage(`@${sender}, I will remind you the next time you type in chat (ID ${rowId})`);
            } else {
                await this._chatService.sendChatMessage(`@${sender}, I will remind ${target} the next time they type in chat (ID ${rowId})`);
            }
        }

    }

    parseUnsetReminderCommand(messageText) {
        const pattern = new RegExp(`^\\${this._commandPrefix}unset\\s+(\\d+)`);
        const match = messageText.match(pattern);

        if (match && match[1]) {
            return match[1];
        } else {
            return;
        }
    }

    async unsetReminderCommand(messageText, data) {
        const sender = data.payload.event.chatter_user_login.toLowerCase()
        const rowId = this.parseUnsetReminderCommand(messageText);
        
        if (!rowId) {
            return;
        }

        let rowIdExists = false;
        for (const reminder of this._reminders) {
            if (reminder.id.toString() === rowId.toString()) {
                this.removeFromArray(this._reminders, reminder);
                rowIdExists = true;
            }
        }
        for (const reminder of this._onSightReminders) {
            if (reminder.id.toString() === rowId.toString()) {
                this.removeFromArray(this._onSightReminders, reminder);
                rowIdExists = true;
            }
        }

        if (!rowIdExists) {
            await this._chatService.sendChatMessage(`@${sender}, No reminder with ID ${rowId} was found`);
            return;
        }

        const deleteQuery = this._db.prepare(`
            DELETE FROM reminders WHERE id = ? AND sender = ?
        `);
        const result = deleteQuery.run(rowId, sender);

        if (result.changes > 0) {
            await this._chatService.sendChatMessage(`@${sender}, Reminder with ID ${rowId} has been unset`);
        } else {
            await this._chatService.sendChatMessage(`@${sender}, no KindaWeird`);
        }
    }
}