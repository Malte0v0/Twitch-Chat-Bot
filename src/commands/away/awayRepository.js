export class AwayRepository {
    constructor(database) {
        this.database = database;
    }

    _checkStatus(status) {
        // Update this too
        if (status) {
            const {
                user_name: userName,
                time,
                message,
                is_away: awayState,
            } = status;
            return { userName, time, message, awayState };
        } else {
            return null;
        }
    }

    checkChatterStatus(userId) {
        // Get from users table
        const status = this.database
            .prepare(
                `
            SELECT user_name, is_away, time, message FROM user_activity
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return this._checkStatus(status);
    }

    toggleAwayStatus(userId, awayState, message = "") {
        this.database
            .prepare(
                `
            UPDATE user_activity
            SET
                is_away = CASE WHEN is_away = 0 THEN ? ELSE 0 END,
                time = CASE WHEN is_away = 0 THEN ? ELSE 0 END,
                message = CASE WHEN is_away = 0 THEN ? ELSE '' END
            WHERE user_id = ?
        `,
            )
            .run(awayState, Date.now(), message, userId);
    }

    insertChatterStatus(userId) {
        this.database
            .prepare(
                `
        INSERT OR IGNORE INTO user_activity (user_id, time, message, is_away)
        VALUES (?,?,?,?,?)
        `,
            )
            .run(userId, Date.now(), "", 0, 0);
    }
}
