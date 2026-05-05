export class HeartrateMonitor {
    constructor(client) {
        this.client = client;

        this.lastKeepaliveMessage = null;
        this.keepaliveTimeoutSeconds = null;

        this.heartbeat = null;
    }

    startListening() {
        this._onWelcome = (session) => {
            this.lastKeepaliveMessage = Date.now();
            this.keepaliveTimeoutSeconds = session.keepalive_timeout_seconds;
        };

        this._onKeepalive = () => {
            this.lastKeepaliveMessage = Date.now();
        };

        this.client.on("welcome", this._onWelcome);

        this.client.on("keepalive", this._onKeepalive);
    }

    stopListening() {
        this.client.off("welcome", this._onWelcome);
        this.client.off("keepalive", this._onKeepalive);
    }

    start() {
        this.startListening();
        this.heartbeat = setInterval(() => {
            const delta = (Date.now() - this.lastKeepaliveMessage) / 1000;
            if (delta > this.keepaliveTimeoutSeconds + 5000) {
                this.client.reconnect();
                console.log(
                    `(${this.client.sessionId}) Twitch WebSocket connection presumed dead (${delta} s since last message), reconnecting...`,
                );
            }
        }, 5000);
    }

    stop() {
        this.stopListening();
        clearInterval(this.heartbeat);
    }

    reset() {
        this.stop();
        this.start();
    }

    insertLastKeepaliveMessage(lastKeepaliveMessage) {
        this.lastKeepaliveMessage = lastKeepaliveMessage;
    }
}
