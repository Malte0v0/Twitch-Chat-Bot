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

        this._onKeepalive = () => {
            this.resetTimer();
        };

        this.client.on("welcome", this._onWelcome);
        this.client.on("keepalive", this._onKeepalive);
    }

    stopListening() {
        this.client.off("welcome", this._onWelcome);
        this.client.off("keepalive", this._onKeepalive);
    }

    resetTimer() {
        clearTimeout(this.heartbeat);
        this.heartbeat = setTimeout(() => {
            console.log(
                `(${this.client.sessionId}) Twitch WebSocket connection presumed dead, reconnecting...`,
            );
            this.client.reconnect();
        }, this.keepaliveTimeoutSeconds * 1000);
    }

    start() {
        this.startListening();
        this.heartbeat = setInterval(() => {
            const delta = (Date.now() - this.lastKeepaliveMessage) / 1000;
            if (delta > this.keepaliveTimeoutSeconds + 5) {
                this.client.reconnect();
                console.log(
                    `(${this.client.sessionId}) Twitch WebSocket connection presumed dead (${delta} s since last message), reconnecting...`,
                );
            }
        }, 5000);
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
