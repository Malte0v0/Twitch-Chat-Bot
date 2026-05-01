import { Reminder } from "../../core/reminder.js";
import { event } from "../../utils/events.js";
import { convertToMs } from "../../utils/timeUtils.js";

export class ReminderService {
    constructor(db, scheduler, notifier) {
        this.db = db;
        this.scheduler = scheduler;
        this.notifier = notifier;
        
        this.startListening();

        this.reminders = new Map();
        this._loadUndeliveredReminders();

        // for (const reminder of this.reminders.values()) {
        //     if (reminder.isDue()) {
        //         this.deliverTimeReminder(reminder);
        //     }
        // }
    }

    printReminders() {
        console.log(this.reminders);
    }

    startListening() {
        this._boundDeliverTime = this.deliverTimeReminder.bind(this);
        this._boundDeliverUser = this.deliverUserReminder.bind(this);

        event.on("job_due", this._boundDeliverTime);
        event.on("user_appeared", this._boundDeliverUser);
    }

    stopListening() {
        event.off("job_due", this._boundDeliverTime);
        event.off("user_appeared", this._boundDeliverUser);
    }

    deliverTimeReminder(reminder) {
        if (!(reminder instanceof Reminder)) return;

        reminder.deliver();
        this.reminders.delete(reminder.rowId);
    }

    deliverUserReminder(data) {
        const sender = data.payload.event.chatter_user_login;
        for (const [id, reminder] of this.reminders.entries()) {
            if (reminder.triggerTime === null && reminder.target.toLowerCase() === sender.toLowerCase()) {
                reminder.deliver();
                this.reminders.delete(id);
            }
        }
    }

    _loadUndeliveredReminders() {
        const remindersDb = this.db.getUndeliveredReminders();

        for (const reminderDb of remindersDb) {
            const reminderDict = {
                id: reminderDb.id,
                sender: reminderDb.sender,
                target: reminderDb.target,
                message: reminderDb.message,
                trigger_time: reminderDb.trigger_time,
                created_at: reminderDb.created_at,
            }
            const reminder = new Reminder(reminderDict, this.db, this.scheduler, this.notifier);
            this.reminders.set(reminder.rowId, reminder);
            reminder.schedule();
        }
    }

    _parseData(data) {
        const sender = data.payload.event.chatter_user_login.toLowerCase();
        const messageText = data.payload.event.message.text.trim().substring(1);
        const currentTime = Date.now();

        const firstPattern = new RegExp(`^remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)$`)
        const secondPattern = new RegExp(`^remind(?:me|\\s+(\\w+))\\s+(.+)in\\s+((?:\\d+\\s*\\w+\\s*)+)$`);
        const thirdPatternNoMessage = new RegExp(`^remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)$`);
        const fourthPatternNoTime = new RegExp(`^remind(?:me|\\s+(\\w+))\\s+(.+)$`);

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

        const targetUser = match[1] || sender;

        let triggerTime = null;
        let timeToTarget = null;
        if (time) {
            timeToTarget = convertToMs(time)
            triggerTime = currentTime + timeToTarget;
        }

        return {
            sender: sender,
            target: targetUser,
            message: message,
            trigger_time: triggerTime,
            created_at: currentTime,
            time: time,
        }
    }

    createReminder(data) {
        const reminderDict = this._parseData(data);
        const reminder = new Reminder(reminderDict, this.db, this.scheduler, this.notifier);
        const result = reminder.init();
        if (!result) {
            return;
        }
        this.reminders.set(reminder.rowId, reminder);
    }

    _parseUnsetData(data) {
        const sender = data.payload.event.chatter_user_login.toLowerCase();
        const messageText = data.payload.event.message.text.trim().substring(1);

        const pattern = new RegExp(`^unset\\s+(\\d+)`);
        const match = messageText.match(pattern);

        if (match && match[1]) {
            return [sender, match[1]];
        } else {
            return;
        }
    }

    deleteReminder(data) {
        const [user, rowIdStr] = this._parseUnsetData(data);

        const rowId = Number(rowIdStr);

        const reminder = this.reminders.get(rowId)
        if (!reminder) {
            this.notifier.notify(user, `Reminder with ID ${rowId} doesn't exist`);
            return;
        }

        reminder.delete(user);
        this.reminders.delete(rowId);
    }
}