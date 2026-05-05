export class EarthquakeRepository {
    constructor(database) {
        this.database = database;
        this.notifiedUNIDCache = new Set();
    }

    populateCache() {
        const rows = this.getRecentNotified();

        for (const row of rows) {
            this.notifiedUNIDCache.add(row.unid);
        }
    }

    insert(quakeRawJSON, quakeObject) {
        const payload = JSON.stringify(quakeRawJSON);

        const insert = this.database.prepare(`
            INSERT INTO earthquakes (unid, mag, depth, lat, lon, region, data)
            VALUES (?,?,?,?,?,?,?)
        `);

        const result = insert.run(
            quakeObject.unId,
            quakeObject.mag,
            quakeObject.depthKm,
            quakeObject.lat,
            quakeObject.lon,
            quakeObject.region,
            payload,
        );

        if (!result.lastInsertRowid) {
            console.log(
                "Error inserting earthquake in to db:",
                result,
                quakeRawJSON,
            );
        }
    }

    setNotified(rowId) {
        this.database
            .prepare(
                `
            UPDATE earthquakes SET notified = 1 WHERE unid = ?
        `,
            )
            .run(rowId);
    }

    getAllNotified() {
        const rows = this.database
            .prepare(
                `
            SELECT unid FROM earthquakes
            WHERE notified = 1
        `,
            )
            .all();

        return rows;
    }

    getRecentNotified(limit = 10) {
        const rows = this.database
            .prepare(
                `
            SELECT unid FROM earthquakes
            WHERE notified = 1
            ORDER BY id DESC
            LIMIT ?
        `,
            )
            .all(limit);

        return rows;
    }

    existsInCache(UNID) {
        return this.notifiedUNIDCache.has(UNID);
    }
}
