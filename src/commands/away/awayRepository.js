export class AwayRepository {
    constructor(database) {
        this.database = database;
    }

    _parseStatus(status) {
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

    getUserStatus(userId) {
        const status = this.database
            .prepare(
                `
            SELECT u.user_name, ua.is_away, ua.time, ua.message 
            FROM user_activity ua
            JOIN users u ON u.user_id = ua.user_id
            WHERE ua.user_id = ?
            `,
            )
            .get(userId);

        if (!status) return null;

        return this._parseStatus(status);
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

    insertNewUser(userId) {
        this.database
            .prepare(
                `
        INSERT OR IGNORE INTO user_activity (user_id, time, message, is_away)
        VALUES (?,?,?,?)
        `,
            )
            .run(userId, Date.now(), "", 0, 0);
    }
}
