export class AwayRepository {
    constructor(database) {
        this.database = database;
    }

    _checkStatus(status) {
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

    getAwayUsernames() {
        const rows = this.database
            .prepare("SELECT user_name FROM chatter_status WHERE is_away != 0")
            .all();
        return rows.map((row) => this._checkStatus(row).userName);
    }

    checkChatterStatusByName(userName) {
        const status = this.database
            .prepare(
                `
            SELECT user_name, time, message, is_away FROM chatter_status
            WHERE user_name = ?
            `,
            )
            .get(userName);

        return this._checkStatus(status);
    }

    checkChatterStatus(userId) {
        const status = this.database
            .prepare(
                `
            SELECT user_name, time, message, is_away FROM chatter_status
            WHERE user_id = ?
            `,
            )
            .get(userId);

        return this._checkStatus(status);
    }

    toggleAwayStatus(userId, awayState = 1, message = "") {
        this.database
            .prepare(
                `
            UPDATE chatter_status
            SET
                is_away = CASE WHEN is_away = 0 THEN ? ELSE 0 END,
                time = CASE WHEN is_away = 0 THEN ? ELSE 0 END,
                message = CASE WHEN is_away = 0 THEN ? ELSE '' END
            WHERE user_id = ?
        `,
            )
            .run(awayState, Date.now(), message, userId);
    }

    insertChatterStatus(userId, userLogin) {
        const currentTime = Date.now();

        this.database
            .prepare(
                `
        INSERT OR IGNORE INTO chatter_status (user_id, user_name, time, message, is_away)
        VALUES (?,?,?,?,?)
        `,
            )
            .run(userId, userLogin, currentTime, "", 0, 0);
    }
}
