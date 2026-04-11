import Database from "better-sqlite3";

export class ChatDatabase extends Database {
    constructor(name = "database.db", database = null) {
        super(name);

        this._initializeDatabase();
    }

    _initializeDatabase() {
        this.exec(`
            CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            target TEXT NOT NULL,
            message TEXT NOT NULL,
            trigger_time INTEGER,
            delivered INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
            )        
        `);
        
        this.exec(`
            CREATE TABLE IF NOT EXISTS chatter_status (
            user_id INTEGER PRIMARY KEY,
            user_name TEXT NOT NULL,
            time INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_afk INTEGER NOT NULL DEFAULT 0,
            is_asleep INTEGER NOT NULL DEFAULT 0
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

        this.exec(`
            CREATE TABLE IF NOT EXISTS location (
            sender TEXT PRIMARY KEY NOT NULL,
            location TEXT NOT NULL
            )        
        `);
    }

    close() {
        this.close();
    }

    getUndeliveredTimeReminders() {
        const reminders = this.prepare(`
            SELECT * FROM reminders
            WHERE delivered = 0
            AND trigger_time IS NOT NULL
        `).all();

        return reminders;
    }

    getUndeliveredUserReminders() {
        const reminders = this.prepare(`
            SELECT * FROM reminders
            WHERE delivered = 0
            AND trigger_time IS NULL
        `).all();

        return reminders;
    }

    getUndeliveredReminders() {
        const reminders = this.prepare(`
            SELECT * FROM reminders
            WHERE delivered = 0
        `).all();

        return reminders;
    }

    setReminderDelivered(rowId) {
        this.prepare(`
            UPDATE reminders SET delivered = 1 WHERE id = ?
        `).run(rowId);
    }

    saveReminder(reminder) {
        const insert = this.prepare(`
            INSERT INTO reminders (sender, target, message, trigger_time, created_at)
            VALUES (?,?,?,?,?)
        `);

        try {
            const result = insert.run(
                reminder.sender,
                reminder.target,
                reminder.message,
                reminder.triggerTime,
                reminder.createdAt
            );

            const rowId = result.lastInsertRowid;

            return rowId;
        } catch (error) {
            console.log("Error in chatdatabse saveReminder: " + error);
            return null;
        }


    }

    deleteReminder(user, reminder) {
        const deleteQuery = this.prepare(`
            DELETE FROM reminders WHERE id = ? AND sender = ?
        `);
        const result = deleteQuery.run(reminder.rowId, user);

        return result;
    }

    rowExists(table, rowId) {
        return this.prepare(`SELECT EXISTS(SELECT 1 FROM ${table} WHERE id = ?) AS exists`).get(rowId).exists;
    }
}