export function initializeDatabase(db) {
    db.exec(`
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
	
    db.exec(`
        CREATE TABLE IF NOT EXISTS chatter_status (
        user_id INTEGER PRIMARY KEY,
        user_name TEXT NOT NULL,
        time INTEGER NOT NULL,
		message TEXT NOT NULL,
        is_afk INTEGER NOT NULL DEFAULT 0,
        is_asleep INTEGER NOT NULL DEFAULT 0
        )        
    `);	

    db.exec(`
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

    db.exec(`
        CREATE TABLE IF NOT EXISTS location (
        sender TEXT PRIMARY KEY NOT NULL,
        location TEXT NOT NULL
        )        
    `);
}