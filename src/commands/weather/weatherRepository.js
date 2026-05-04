export class WeatherRepository {
    constructor(database) {
        this.database = database;
    }

    getLocation(userId) {
        const location = this.database
            .prepare(
                `
            SELECT location FROM locations
            WHERE user_id = ?
        `,
            )
            .get(userId);

        return location.location;
    }
}
