import { event } from "../../utils/events.js";
import { msToHuman } from "../../utils/timeUtils.js";
import { AWAY_STATUS } from "../../utils/awayStatus.js";

export class AwayService {
    constructor(chatService, db, commandPrefix) {
        this._chatService = chatService;
        this._db = db;

        this._commandPrefix = commandPrefix;

        this._startListening();
    }

    _startListening() {
        event.on("user_appeared", this.handleAway.bind(this));
    }

    _stopListening() {
        event.off("user_appeared", this.handleAway.bind(this));
    }

    handleAway(data) {
        try {
            const userId = data.payload.event.chatter_user_id;
            const userLogin = data.payload.event.chatter_user_login;
            const status = this.checkChatterStatus(userId);

            if (status && status.awayState != 0) {
                const timeSince = msToHuman(Date.now() - status.time);

                switch (status.awayState) {
                    case AWAY_STATUS.afk:
                        this.toggleAwayStatus(userId);
                        this._chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer AFK${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    case AWAY_STATUS.asleep:
                        this.toggleAwayStatus(userId);
                        this._chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer sleeping${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    case AWAY_STATUS.showering:
                        this.toggleAwayStatus(userId);
                        this._chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer showering${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    default:
                        break;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    getAwayUsernames() {
        const rows = this._db
            .prepare("SELECT user_name FROM chatter_status WHERE is_away != 0")
            .all();
        return rows.map((row) => this._checkStatus(row).userName);
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

    checkChatterStatusByName(userName) {
        const status = this._db
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
        const status = this._db
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
        this._db
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

    insertChatterStatus(data) {
        const userId = data.payload.event.chatter_user_id;
        const userLogin = data.payload.event.chatter_user_login;
        const currentTime = Date.now();

        this._db
            .prepare(
                `
        INSERT OR IGNORE INTO chatter_status (user_id, user_name, time, message, is_away)
        VALUES (?,?,?,?,?)
        `,
            )
            .run(userId, userLogin, currentTime, "", 0, 0);
    }

    async setUserStatus(messageText, data, awayState = 1) {
        const userId = data.payload.event.chatter_user_id;
        const userLogin = data.payload.event.chatter_user_login;

        let status = this.checkChatterStatus(userId);
        if (!status) {
            this.insertChatterStatus(data);
            status = this.checkChatterStatus(userId);
        }

        // Get the away message and format it in to a variable called message
        const pattern = new RegExp(
            `\\${this._commandPrefix}${Object.keys(AWAY_STATUS).find((k) => AWAY_STATUS[k] === awayState)} (.*)`,
        );
        const match = messageText.match(pattern);
        let message = "";
        if (match && match[1]) {
            message = ": " + match[1].trim();
        }

        switch (awayState) {
            case AWAY_STATUS.afk:
                this.toggleAwayStatus(userId, AWAY_STATUS.afk, message);
                await this._chatService.sendChatMessage(
                    `${userLogin} is now AFK${message}`,
                );
                break;
            case AWAY_STATUS.asleep:
                this.toggleAwayStatus(userId, AWAY_STATUS.asleep, message);
                await this._chatService.sendChatMessage(
                    `${userLogin} is now sleeping${message}`,
                );
                break;
            case AWAY_STATUS.showering:
                this.toggleAwayStatus(userId, AWAY_STATUS.showering, message);
                await this._chatService.sendChatMessage(
                    `${userLogin} is now showering xqcShower ${message}`,
                );
                break;
            default:
                break;
        }
    }
}
