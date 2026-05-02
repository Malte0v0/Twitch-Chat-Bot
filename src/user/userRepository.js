export class UserRepository {
    constructor(database) {
        this.database = database;
    }

    insertUser() {}

    userExists() {}

    getUser() {
        const user = this.database
            .prepare(
                `
            SELECT * FROM users
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return this._checkStatus(status);
    }
}
