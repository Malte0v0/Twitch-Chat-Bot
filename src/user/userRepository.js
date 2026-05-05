export class UserRepository {
    constructor(database) {
        this.database = database;
    }

    insertUser(userId, userLogin, userName) {
        const result = this.database
            .prepare(
                `
            INSERT INTO users (user_id, user_login, user_name)
            VALUES (?,?,?)
            `,
            )
            .run(userId, userLogin, userName);

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

    getUserName(userId) {
        const row = this.database
            .prepare(
                `
            SELECT user_name FROM users
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return row?.user_name ?? null;
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
