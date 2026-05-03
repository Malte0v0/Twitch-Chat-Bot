import { event } from "../../utils/events.js";
import { convertToMs } from "../../utils/timeUtils.js";
import { ReminderModel } from "./reminderModel.js";
import { ReminderParser } from "./reminderParser.js";
import { ReminderRepository } from "./reminderRepository.js";

export class ReminderService {
    constructor(chatService, database, scheduler) {
        this.chatService = chatService;
        this.scheduler = scheduler;

        this.reminderRepository = new ReminderRepository(database);
        this.reminderParser = new ReminderParser();

        this.startListening();

        this.reminders = new Map();
        this.loadUndeliveredReminders();

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
        if (!(reminder instanceof ReminderModel)) return;

        reminder.deliver();
        this.reminders.delete(reminder.rowId);
    }

    deliverUserReminder(userLogin) {
        for (const [id, reminder] of this.reminders.entries()) {
            if (
                reminder.triggerTime === null &&
                reminder.target.toLowerCase() === userLogin.toLowerCase()
            ) {
                reminder.deliver();
                this.reminders.delete(id);
            }
        }
    }

    loadUndeliveredReminders() {
        const remindersDb = this.reminderRepository.getUndeliveredReminders();

        for (const reminderDb of remindersDb) {
            const reminderDict = {
                id: reminderDb.id,
                userLogin: reminderDb.userLogin,
                target: reminderDb.target,
                message: reminderDb.message,
                trigger_time: reminderDb.trigger_time,
                created_at: reminderDb.created_at,
            };
            const reminder = new ReminderModel(
                reminderDict,
                this.reminderRepository,
                this.scheduler,
            );
            this.reminders.set(reminder.rowId, reminder);
            reminder.schedule();
        }
    }

    createReminder(data) {
        const reminderDict = this.reminderParser.parseData(data);
        const reminder = new ReminderModel(
            reminderDict,
            this.reminderRepository,
            this.scheduler,
        );
        const result = reminder.init();
        if (!result) {
            return;
        }
        this.reminders.set(reminder.rowId, reminder);
    }

    deleteReminder(data) {
        const [user, rowIdStr] = this.reminderParser.parseUnsetData(data);

        const rowId = Number(rowIdStr);

        const reminder = this.reminders.get(rowId);
        if (!reminder) {
            this.chatService.sendFormattedMessage(
                user,
                `Reminder with ID ${rowId} doesn't exist`,
            );
            return;
        }

        reminder.delete(user);
        this.reminders.delete(rowId);
    }
}
