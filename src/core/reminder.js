import { convertToMs, msToHuman } from "../utils/timeUtils.js";

export class Reminder {
    constructor(reminderDict, db, scheduler, notifier) {
        this.sender = reminderDict.sender;
        this.target = reminderDict.target;
        this.message = reminderDict.message;
        this.triggerTime = reminderDict.trigger_time || null;
        this.createdAt = reminderDict.created_at;
        this.timeString = reminderDict.time || null;
        this.rowId = reminderDict.id || null;

        this.db = db;
        this.scheduler = scheduler;
        this.notifier = notifier;
    }

    init() {
        this.rowId = this.db.saveReminder(this);
        if (!this.rowId) {
            return false;
        }
        this.schedule();
        this.notifyInit();
        return true;
    }

    schedule() {
        if (this.triggerTime) this.scheduler.addJob(this, this.triggerTime);
    }

    isDue() {
        return this.triggerTime !== null && this.triggerTime <= Date.now();
    }

    notifyInit() {
        const target = (this.sender != this.target) ? this.target : "you";
        let message = `I will remind ${target}`;

        if (this.timeString) {
            const timeUntil = msToHuman(convertToMs(this.timeString));
            message += ` in ${timeUntil} (ID ${this.rowId})`;
        } else {
            const whosThey = (target == "you") ? "you" : "they";
            message += ` the next time ${whosThey} type in chat (ID ${this.rowId})`;
        }

        this.notifier.notify(this.sender, message);
    }

    delete(user) {
        const result = this.db.deleteReminder(user, this);
        if (result.changes !== 0) this.scheduler.removeJob(this);
        this.notifyDelete(user, result);
    }

    notifyNonExistent(user) {
        this.notifier.notify(user, `Reminder with ID ${this.rowId} doesn't exist`);
    }

    notifyDelete(user, result) {
        if (result.changes == 0) {
            this.notifier.notify(user, `Nono`);
        } else {
            this.notifier.notify(user, `Reminder with ID ${this.rowId} has been unset`);
        }
    }

    deliver() {
        this.notifyDeliver();
        this.db.setReminderDelivered(this.rowId);
    }
    
    notifyDeliver() {
        const target = (this.sender != this.target) ? this.sender : "yourself";
    
        const timeSinceSet = msToHuman(Date.now() - this.createdAt);
        const prefix = `reminder from ${target} (${timeSinceSet} ago)`;
        const suffix = this.message ? `: ${this.message}` : "";

        this.notifier.notify(this.target, prefix+suffix);
    }
}