import Database from "better-sqlite3";

export class ChatDatabase extends Database {
    constructor(name = "database.db") {
        super(name);
        super.pragma("foreign_keys = ON");
    }

    initialize() {
        this.exec(`
            CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            user_login TEXT NOT NULL,
            user_name TEXT NOT NULL
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS user_activity (
            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) NOT NULL,
            away_status INTEGER NOT NULL DEFAULT 0,
            time INTEGER NOT NULL,
            message TEXT NOT NULL
            )    
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_user_id INTEGER REFERENCES users(user_id) NOT NULL,
            target_user_id INTEGER REFERENCES users(user_id) NOT NULL,
            message TEXT,
            created_at INTEGER NOT NULL,
            trigger_time INTEGER,
            delivered INTEGER NOT NULL DEFAULT 0
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS locations (
            user_id INTEGER PRIMARY KEY REFERENCES users(user_id) NOT NULL,
            location TEXT NOT NULL
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS movies (
            movie_id INTEGER PRIMARY KEY AUTOINCREMENT,
            omdb_id TEXT NOT NULL,
            json TEXT
            )        
        `);

        this.exec(`
            CREATE TABLE IF NOT EXISTS weekly_movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(user_id) NOT NULL,
            week_num INTEGER NOT NULL,
            movie_id INTEGER REFERENCES movies(movie_id) NOT NULL
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
}
