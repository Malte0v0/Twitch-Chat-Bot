import { event } from "../../utils/events.js";
import { msToHuman } from "../../utils/timeUtils.js";

export class StatusService {
    constructor(chatService, db, commandPrefix) {
        this._chatService = chatService;
        this._db = db;

        this._commandPrefix = commandPrefix;

        this._startListening();
    }

    _startListening() {
        event.on("user_appeared", this.handleAfkAsleep.bind(this));
    }
    
    _stopListening() {
        event.off("user_appeared", this.handleAfkAsleep.bind(this));
    }

    handleAfkAsleep(data) {
        try {
            const userId = data.payload.event.chatter_user_id;
            const userLogin = data.payload.event.chatter_user_login;
            const status = this.checkChatterStatus(userId);

            if (status && (status.isAfk || status.isAsleep)) {
                const timeSince = msToHuman(Date.now() - status.time); 
                
                if (status.isAfk) {
                    this.toggleAfkStatus(userId);
                    this._chatService.sendChatMessage(`@${userLogin} is no longer AFK${status.message} (${timeSince})`)
                        .catch((error) => {
                            console.log("Error when trying to send chat message in statusService: ", error);
                        });
                } else if (status.isAsleep) {
                    this.toggleAsleepStatus(userId);
                    this._chatService.sendChatMessage(`@${userLogin} is no longer sleeping${status.message} (${timeSince})`)
                        .catch((error) => {
                            console.log("Error when trying to send chat message in statusService: ", error);
                        });;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    getAfkOrAsleepUsernames() {
        const query = this._db.prepare("SELECT user_name FROM chatter_status WHERE is_afk = 1 OR is_asleep = 1");
        const rows = query.all();

        return rows.map(row => row.user_name);
    }

    checkChatterStatusByName(userName) {
        const status = this._db.prepare(`
        SELECT user_name, time, message, is_afk, is_asleep FROM chatter_status
        WHERE user_name = ?
        `).get(userName);

        if (status) {
            const {user_name: user_name, time: time, message: message, is_afk: isAfk, is_asleep: isAsleep} = status;
            return {user_name, time, message, isAfk, isAsleep};
        } else {
            return null;
        }
    }

    checkChatterStatus(userId) {
        const status = this._db.prepare(`
        SELECT user_name, time, message, is_afk, is_asleep FROM chatter_status
        WHERE user_id = ?
        `).get(userId);

        if (status) {
            const {user_name: user_name, time: time, message: message, is_afk: isAfk, is_asleep: isAsleep} = status;
            return {user_name, time, message, isAfk, isAsleep};
        } else {
            return null;
        }
    }

    toggleAfkStatus(userId, message = "") {
        this._db.prepare(`
            UPDATE chatter_status SET is_afk = NOT is_afk, time = ?, message = ? WHERE user_id = ?
        `).run(Date.now(), message, userId);
    }

    toggleAsleepStatus(userId, message = "") {
        this._db.prepare(`
            UPDATE chatter_status SET is_asleep = NOT is_asleep, time = ?, message = ? WHERE user_id = ?
        `).run(Date.now(), message, userId);
    }

    insertChatterStatus(data) {
        const userId = data.payload.event.chatter_user_id
        const userLogin = data.payload.event.chatter_user_login
        const currentTime = Date.now()

        this._db.prepare(`
        INSERT OR IGNORE INTO chatter_status (user_id, user_name, time, message, is_afk, is_asleep)
        VALUES (?,?,?,?,?,?)
        `).run(userId, userLogin, currentTime, "", 0, 0);
    }

    async setUserStatus(messageText, data, statusType) {
        const userId = data.payload.event.chatter_user_id
        const userLogin = data.payload.event.chatter_user_login
        
        let status = this.checkChatterStatus(userId);
        if (!status) {
            this.insertChatterStatus(data);
            status = this.checkChatterStatus(userId);
        }
        
        // Get the afk or sleep message and format it in to a variable called message
        const pattern = new RegExp(`\\${this._commandPrefix}${statusType} (.*)`)
        const match = messageText.match(pattern);
        let message = "";
        if (match && match[1]) {
            message = ": " + match[1].trim();
        }

        if (statusType === "afk") {
            this.toggleAfkStatus(userId, message);
            await this._chatService.sendChatMessage(`${userLogin} is now AFK${message}`);
        } else if (statusType === "sleep") {
            this.toggleAsleepStatus(userId, message);
            await this._chatService.sendChatMessage(`${userLogin} is now sleeping${message}`);
        }
    }
}