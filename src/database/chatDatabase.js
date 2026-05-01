import Database from "better-sqlite3";

const ALLOWED_TABLES = ["reminders", "users", "locations", "earthquakes"];

export class ChatDatabase extends Database {
    constructor(name = "database.db") {
        super(name);
        super.pragma("foreign_keys = ON");

        this._initializeDatabase();
    }

    _initializeDatabase() {
        this.exec(`
            CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            user_login TEXT NOT NULL,
            user_name TEXT NOT NULL
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER REFERENCES users(user_id) NOT NULL,
            target_id INTEGER REFERENCES users(user_id) NOT NULL,
            message TEXT,
            created_at INTEGER NOT NULL,
            trigger_time INTEGER,
            delivered INTEGER NOT NULL DEFAULT 0
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER REFERENCES users(user_id) NOT NULL,
            location TEXT NOT NULL
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS earthquakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unid TEXT NOT NULL,
            notified INTEGER NOT NULL DEFAULT 0,
            mag REAL,
            depth REAL,
            lat REAL,
            lon REAL,
            region TEXT,
            data TEXT
            )        
        `);
    }

    close() {
        super.close();
    }

    getUndeliveredReminders() {
        const reminders = this.prepare(
            `
            SELECT * FROM reminders
            WHERE delivered = 0
        `,
        ).all();

        return reminders;
    }

    setReminderDelivered(rowId) {
        this.prepare(
            `
            UPDATE reminders SET delivered = 1 WHERE id = ?
        `,
        ).run(rowId);
    }

    saveReminder(reminder) {
        const insert = this.prepare(`
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
        const deleteQuery = this.prepare(`
            DELETE FROM reminders WHERE id = ?
        `);
        const result = deleteQuery.run(rowId);

        return result;
    }

    rowExists(table, rowId) {
        if (!ALLOWED_TABLES.includes(table))
            throw new Error(`Invalid table: ${table}`);

        return this.prepare(
            `SELECT EXISTS(SELECT 1 FROM ${table} WHERE id = ?) AS exists`,
        ).get(rowId).exists;
    }
}
