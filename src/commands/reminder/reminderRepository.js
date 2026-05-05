export class ReminderRepository {
    constructor(database) {
        this.database = database;
    }

    getAllUndelivered() {
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

    setDelivered(rowId) {
        this.database
            .prepare(
                `
            UPDATE reminders SET delivered = 1 WHERE id = ?
            `,
            )
            .run(rowId);
    }

    save(reminder) {
        const insert = this.database.prepare(`
            INSERT INTO reminders (sender_user_id, target_user_id, message, created_at, trigger_time)
            VALUES (?,?,?,?,?)
        `);

        try {
            const result = insert.run(
                reminder.senderUserId,
                reminder.targetUserId,
                reminder.message,
                reminder.createdAt,
                reminder.triggerTime,
            );

            const rowId = result.lastInsertRowid;

            return rowId;
        } catch (error) {
            console.log("Error in chatdatabse save: " + error);
            return null;
        }
    }

    delete(rowId) {
        const deleteQuery = this.database.prepare(`
            DELETE FROM reminders WHERE id = ?
        `);
        const result = deleteQuery.run(rowId);

        return result;
    }
}
