export class WeatherRepository {
    constructor(database) {
        this.database = database;
    }

    getLocation(userId) {
        const location = this.database
            .prepare(
                `
            SELECT location FROM location
            WHERE sender = ?
        `,
            )
            .get(userId);

        return location.location;
    }
}
