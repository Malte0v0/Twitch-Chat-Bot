export class LocationRepository {
    constructor(database) {
        this.database = database;
    }

    insertLocation(userId, location) {
        const insert = this.database.prepare(`
            INSERT OR REPLACE INTO locations (user_id, location)
            VALUES (?,?)
        `);
        const result = insert.run(userId, location);

        return result;
    }
}
