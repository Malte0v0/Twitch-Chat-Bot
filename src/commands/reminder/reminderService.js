import { event } from "../../utils/events.js";
import { ReminderModel } from "./reminderModel.js";
import { ReminderParser } from "./reminderParser.js";
import { ReminderRepository } from "./reminderRepository.js";

export class ReminderService {
    constructor(chatService, userRepository, database, scheduler) {
        this.chatService = chatService;
        this.userRepository = userRepository;
        this.scheduler = scheduler;

        this.reminderRepository = new ReminderRepository(database);

        this.reminders = new Map();
        this.loadUndeliveredReminders();

        // for (const reminder of this.reminders.values()) {
        //     if (reminder.isDue()) {
        //         this.deliverTimeReminder(reminder);
        //     }
        // }
    }

    print() {
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
        if (!(reminder instanceof ReminderModel)) return;

        reminder.deliver();
        this.reminders.delete(reminder.rowId);
    }

    deliverUserReminder(data) {
        const userId = data.payload.event.chatter_user_id;

        for (const [id, reminder] of this.reminders.entries()) {
            if (
                reminder.triggerTime === null &&
                reminder.targetUserId == userId
            ) {
                reminder.deliver();
                this.reminders.delete(id);
            }
        }
    }

    loadUndeliveredReminders() {
        const remindersDb = this.reminderRepository.getAllUndelivered();

        for (const reminderDb of remindersDb) {
            const reminderDict = ReminderParser.parseDbData(reminderDb);
            const reminder = new ReminderModel(
                this.chatService,
                this.reminderRepository,
                this.userRepository,
                reminderDict,
                this.scheduler,
            );
            this.reminders.set(reminder.rowId, reminder);
            reminder.schedule();
        }
    }

    create(userId, messageText) {
        const reminderDict = ReminderParser.parseData(
            userId,
            this.userRepository,
            messageText,
        );

        if (!this.userRepository.userExists(reminderDict.targetUserId)) {
            this.chatService.sendFormattedMessage(
                this.userRepository.getUserName(userId),
                "This user has not been registered in the database",
            );
            return;
        }

        const reminder = new ReminderModel(
            this.chatService,
            this.reminderRepository,
            this.userRepository,
            reminderDict,
            this.scheduler,
        );
        const result = reminder.init();
        if (!result) {
            return;
        }
        this.reminders.set(reminder.rowId, reminder);
    }

    delete(userLogin, userId, rowIdStr) {
        const rowId = Number(rowIdStr);

        const reminder = this.reminders.get(rowId);
        if (!reminder) {
            this.chatService.sendFormattedMessage(
                userLogin,
                `Reminder with ID ${rowId} doesn't exist`,
            );
            return;
        }

        reminder.delete();
        this.reminders.delete(rowId);
        this.chatService.sendFormattedMessage(
            userLogin,
            `Reminder with ID ${rowId} has been unset`,
        );
    }
}
