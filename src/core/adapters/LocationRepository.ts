import type { ChatDatabase } from "../../chatDatabase.js";

interface LocationRow {
  location: string;
}

export class LocationRepository {
  constructor(private database: ChatDatabase) {}

  saveLocation(userId: string, location: string) {
    const insert = this.database.prepare(`
            INSERT OR REPLACE INTO locations (user_id, location)
            VALUES (?,?)
        `);
    const result = insert.run(userId, location);
  }

  getLocation(userId: string) {
    const result = this.database
      .prepare<string[], LocationRow>(
        `
            SELECT location FROM locations
            WHERE user_id = ?
        `,
      )
      .get(userId);

    return result?.location ?? null;
  }
}
