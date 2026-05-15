import { DatabaseError } from "../errors/errors";
import { logTime } from "../errors/log";

export class EarthquakeRepository {
    constructor(database) {
        this.database = database;
        this.notifiedUNIDCache = new Set();
    }

    populateCache() {
        try {
            const rows = this.getRecentNotified();
            for (const row of rows) {
                this.notifiedUNIDCache.add(row.unid);
            }
        } catch (error) {
            throw new DatabaseError(
                `Failed to populate UNID cache: ${error.message}`,
                error,
            );
        }
    }

    insert(quakeRawJSON, quakeObject) {
        try {
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
                throw new DatabaseError(
                    `Insert returned no rowid for UNID (${quakeObject.unId})`,
                );
            }
        } catch (error) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return null;
            }
            if (error instanceof DatabaseError) throw error;
            throw new DatabaseError(
                `Earthquake with UNID (${quakeObject.unId}) failed to insert with error code: ${error.code}`,
                error,
            );
        }
    }

    setNotified(unId) {
        try {
            this.database
                .prepare(
                    `
                UPDATE earthquakes SET notified = 1 WHERE unid = ?
            `,
                )
                .run(unId);
        } catch (error) {
            throw new DatabaseError(
                `Failed to set notified for UNID (${unId}): ${error.message}`,
                error,
            );
        }
    }

    getAllNotified() {
        try {
            const rows = this.database
                .prepare(
                    `
                SELECT unid FROM earthquakes
                WHERE notified = 1
            `,
                )
                .all();

            return rows;
        } catch (error) {
            throw new DatabaseError(
                `Failed to fetch all notified earthquakes: ${error.message}`,
                error,
            );
        }
    }

    getRecentNotified(limit = 10) {
        try {
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
        } catch (error) {
            throw new DatabaseError(
                `Failed to fetch recent notified earthquakes: ${error.message}`,
                error,
            );
        }
    }

    existsInCache(UNID) {
        return this.notifiedUNIDCache.has(UNID);
    }
}
