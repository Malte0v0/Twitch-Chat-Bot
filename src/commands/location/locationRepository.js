export class LocationRepository {
    constructor(database) {
        this.database = database;
    }

    insertLocation(userId, location) {
        const insert = this._db.prepare(`
            INSERT OR REPLACE INTO location (sender, location)
            VALUES (?,?)
        `);
        const result = insert.run(userId, location);

        return result;
    }
}
