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

        this._onNotification = () => {
            this.resetTimer();
        };

        this.client.on("welcome", this._onWelcome);
        this.client.on("notification", this._onNotification);
    }

    stopListening() {
        this.client.off("welcome", this._onWelcome);
        this.client.off("notification", this._onNotification);
    }

    resetTimer() {
        clearTimeout(this.heartbeat);
        if (!this.keepaliveTimeoutSeconds) return;
        this.heartbeat = setTimeout(
            () => {
                console.log(
                    `(${this.client.sessionId}) Twitch WebSocket connection presumed dead, reconnecting...`,
                );
                this.client.reconnect();
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
    }

    reset() {
        this.stop();
        this.start();
    }
}
