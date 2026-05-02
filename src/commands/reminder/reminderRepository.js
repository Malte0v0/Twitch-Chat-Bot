export class ReminderRepository {
    constructor(database) {
        this.database = database;
    }

    getUndeliveredReminders() {
        const reminders = this.database
            .prepare(
                `
            SELECT * FROM reminders
            WHERE delivered = 0
        `,
            )
            .all();

        return reminders;
    }

    setReminderDelivered(rowId) {
        this.database
            .prepare(
                `
            UPDATE reminders SET delivered = 1 WHERE id = ?
        `,
            )
            .run(rowId);
    }

    saveReminder(reminder) {
        const insert = this.database.prepare(`
            INSERT INTO reminders (sender_id, target_id, message, created_at, trigger_time)
            VALUES (?,?,?,?,?)
        `);

        try {
            const result = insert.run(
                reminder.senderId,
                reminder.targetId,
                reminder.message,
                reminder.createdAt,
                reminder.triggerTime,
            );

            const rowId = result.lastInsertRowid;

            return rowId;
        } catch (error) {
            console.log("Error in chatdatabse saveReminder: " + error);
            return null;
        }
    }

    deleteReminder(rowId) {
        const deleteQuery = this.database.prepare(`
            DELETE FROM reminders WHERE id = ?
        `);
        const result = deleteQuery.run(rowId);

        return result;
    }
}
