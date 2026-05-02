import { convertToMs, msToHuman } from "../../utils/timeUtils.js";

export class ReminderModel {
    constructor(chatService, reminderDict, database, scheduler) {
        this.userLogin = reminderDict.userLogin;
        this.target = reminderDict.target;
        this.message = reminderDict.message;
        this.triggerTime = reminderDict.trigger_time || null;
        this.createdAt = reminderDict.created_at;
        this.timeString = reminderDict.time || null;
        this.rowId = reminderDict.id || null;

        this.chatService = chatService;
        this.reminderRepository = reminderRepository;
        this.scheduler = scheduler;
    }

    init() {
        this.rowId = this.reminderRepository.saveReminder(this);
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
        const target = this.userLogin != this.target ? this.target : "you";
        let message = `I will remind ${target}`;

        if (this.timeString) {
            const timeUntil = msToHuman(convertToMs(this.timeString));
            message += ` in ${timeUntil} (ID ${this.rowId})`;
        } else {
            const whosThey = target == "you" ? "you" : "they";
            message += ` the next time ${whosThey} type in chat (ID ${this.rowId})`;
        }

        this.chatService.sendFormattedMessage(this.userLogin, message);
    }

    delete(user) {
        const result = this.reminderRepository.deleteReminder(user, this);
        if (result.changes !== 0) this.scheduler.removeJob(this);
        this.notifyDelete(user, result);
    }

    notifyNonExistent(user) {
        this.chatService.sendFormattedMessage(
            user,
            `Reminder with ID ${this.rowId} doesn't exist`,
        );
    }

    notifyDelete(user, result) {
        if (result.changes == 0) {
            this.chatService.sendFormattedMessage(user, `Nono`);
        } else {
            this.chatService.sendFormattedMessage(
                user,
                `Reminder with ID ${this.rowId} has been unset`,
            );
        }
    }

    deliver() {
        this.notifyDeliver();
        this.reminderRepository.setReminderDelivered(this.rowId);
    }

    notifyDeliver() {
        const target =
            this.userLogin != this.target ? this.userLogin : "yourself";

        const timeSinceSet = msToHuman(Date.now() - this.createdAt);
        const prefix = `reminder from ${target} (${timeSinceSet} ago)`;
        const suffix = this.message ? `: ${this.message}` : "";

        this.chatService.sendFormattedMessage(this.target, prefix + suffix);
    }
}
