import { logTime } from "../errors/log.js";

export class HeartrateMonitor {
    constructor(client) {
        this.client = client;

        this.keepaliveTimeoutSeconds = null;

        this.heartbeat = null;
    }

    startListening() {
        this._onWelcome = (session) => {
            this.keepaliveTimeoutSeconds = session.keepalive_timeout_seconds;
            this.resetTimer();
        };

        this._onMessage = () => {
            this.resetTimer();
        };

        this.client.on("welcome", this._onWelcome);
        this.client.on("message", this._onMessage);
    }

    stopListening() {
        this.client.off("welcome", this._onWelcome);
        this.client.off("message", this._onMessage);
    }

    resetTimer() {
        clearTimeout(this.heartbeat);
        if (!this.keepaliveTimeoutSeconds) return;
        this.heartbeat = setTimeout(
            () => {
                logTime(
                    `(${this.client.sessionId}) Twitch WebSocket connection presumed dead, reconnecting...`,
                    2,
                );
                this.client.emit("hard_reconnect");
            },
            (this.keepaliveTimeoutSeconds + 5) * 1000,
        );
    }

    start() {
        this.startListening();
    }

    stop() {
        this.stopListening();
        clearTimeout(this.heartbeat);
        logTime(`(${this.client.sessionId}) Twitch Heartrate Monitor stopped`);
    }

    reset() {
        this.stop();
        this.start();
    }
}
