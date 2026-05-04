export class UserRepository {
    constructor(database) {
        this.database = database;
    }

    insertUser(userId) {
        const result = this.database
            .prepare(
                `
            SELECT * FROM users
            WHERE user_id = ?
            `,
            )
            .run(userId);

        if (!result) return null;

        return result;
    }

    userExists(userId) {
        const user = this.database
            .prepare(
                `
            SELECT * FROM users
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return user;
    }

    getUserLogin(userId) {
        const row = this.database
            .prepare(
                `
            SELECT user_login FROM users
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return row?.user_login ?? null;
    }

    getUserId(userName) {
        userName = userName.toLowerCase().trim();

        const row = this.database
            .prepare(
                `
            SELECT user_id FROM users
            WHERE user_name = ? OR user_login = ?
            `,
            )
            .get(userName, userName);

        return row?.user_id ?? null;
    }
}
