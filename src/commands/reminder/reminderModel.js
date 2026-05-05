import { convertToMs, msToHuman } from "../../utils/timeUtils.js";

export class ReminderModel {
    constructor(
        chatService,
        reminderRepository,
        userRepository,
        reminderDict,
        scheduler,
    ) {
        this.senderUserId = reminderDict.senderUserId;
        this.targetUserId = reminderDict.targetUserId;
        this.message = reminderDict.message;
        this.triggerTime = reminderDict.triggerTime || null;
        this.createdAt = reminderDict.createdAt;
        this.timeString = reminderDict.time || null;
        this.rowId = reminderDict.id || null;

        this.chatService = chatService;
        this.reminderRepository = reminderRepository;
        this.userRepository = userRepository;
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
        const targetName =
            this.senderUserId != this.targetUserId
                ? this.userRepository.getUserName(this.targetUserId)
                : "you";
        let message = `I will remind ${targetName}`;

        if (this.timeString) {
            const timeUntil = msToHuman(convertToMs(this.timeString));
            message += ` in ${timeUntil} (ID ${this.rowId})`;
        } else {
            const whosThey = targetName == "you" ? "you" : "they";
            message += ` the next time ${whosThey} type in chat (ID ${this.rowId})`;
        }

        this.chatService.sendFormattedMessage(
            this.userRepository.getUserName(this.senderUserId),
            message,
        );
    }

    delete() {
        const result = this.reminderRepository.delete(this.rowId);
        if (result.changes !== 0) this.scheduler.removeJob(this);
    }

    deliver() {
        this.notifyDeliver();
        this.reminderRepository.setDelivered(this.rowId);
    }

    notifyDeliver() {
        const targetUserName = this.userRepository.getUserName(
            this.targetUserId,
        );

        const senderUserName = this.userRepository.getUserName(
            this.senderUserId,
        );

        const targetName =
            this.senderUserId != this.targetUserId
                ? senderUserName
                : "yourself";

        const timeSinceSet = msToHuman(Date.now() - this.createdAt);
        const prefix = `reminder from ${targetName} (${timeSinceSet} ago)`;
        const suffix = this.message ? `: ${this.message}` : "";

        this.chatService.sendFormattedMessage(targetUserName, prefix + suffix);
    }
}
