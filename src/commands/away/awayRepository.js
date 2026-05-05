export class AwayRepository {
    constructor(database) {
        this.database = database;
    }

    _parseStatus(status) {
        // Update this too
        if (status) {
            const {
                user_name: userName,
                away_status: awayState,
                time,
                message,
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
            SELECT u.user_name, ua.away_status, ua.time, ua.message 
            FROM user_activity ua
            JOIN users u ON u.user_id = ua.user_id
            WHERE ua.user_id = ?
            `,
            )
            .get(userId);

        if (!status) return null;

        return this._parseStatus(status);
    }

    toggleAway(userId, awayState, message = "") {
        const isAway = this.getUserStatus(userId)?.awayState > 0;

        this.database
            .prepare(
                `
            UPDATE user_activity
            SET
                away_status = ?,
                time = ?,
                message = ?
            WHERE user_id = ?
        `,
            )
            .run(
                isAway ? 0 : awayState,
                isAway ? 0 : Date.now(),
                isAway ? "" : message,
                userId,
            );
    }

    insertNewUser(userId) {
        this.database
            .prepare(
                `
        INSERT OR IGNORE INTO user_activity (user_id, time, message, away_status)
        VALUES (?,?,?,?)
        `,
            )
            .run(userId, Date.now(), "", 0);
    }
}
