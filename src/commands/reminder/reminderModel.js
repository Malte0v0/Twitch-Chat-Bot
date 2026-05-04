import { convertToMs, msToHuman } from "../../utils/timeUtils.js";

export class ReminderModel {
    constructor(chatService, reminderRepository, reminderDict, scheduler) {
        this.senderUserId = reminderDict.senderUserId;
        this.targetUserId = reminderDict.targetUserId;
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
        this.rowId = this.reminderRepository.save(this);
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
        const targetLogin =
            this.senderUserId != this.targetUserId
                ? this.userRepository.getUserLogin(this.targetUserId)
                : "you";
        let message = `I will remind ${targetLogin}`;

        if (this.timeString) {
            const timeUntil = msToHuman(convertToMs(this.timeString));
            message += ` in ${timeUntil} (ID ${this.rowId})`;
        } else {
            const whosThey = targetLogin == "you" ? "you" : "they";
            message += ` the next time ${whosThey} type in chat (ID ${this.rowId})`;
        }

        this.chatService.sendFormattedMessage(
            this.userRepository.getUserLogin(this.senderUserId),
            message,
        );
    }

    delete() {
        const result = this.reminderRepository.delete(this.rowId);
        if (result.changes !== 0) this.scheduler.removeJob(this);
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
        this.reminderRepository.setDelivered(this.rowId);
    }

    notifyDeliver() {
        const target =
            this.senderUserId != this.targetUserId
                ? this.senderUserId
                : "yourself";

        const timeSinceSet = msToHuman(Date.now() - this.createdAt);
        const prefix = `reminder from ${target} (${timeSinceSet} ago)`;
        const suffix = this.message ? `: ${this.message}` : "";

        this.chatService.sendFormattedMessage(
            this.targetUserId,
            prefix + suffix,
        );
    }
}
