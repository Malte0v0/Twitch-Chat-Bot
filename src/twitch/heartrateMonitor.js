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

        this._onEventOrKeepalive = () => {
            this.resetTimer();
        };

        this.client.on("welcome", this._onWelcome);
        this.client.on("keepalive", this._onEventOrKeepalive);
        this.client.on("message", this._onEventOrKeepalive);
        this.client.on("session_reconnect", this._onEventOrKeepalive);
        this.client.on("revocation", this._onEventOrKeepalive);
    }

    stopListening() {
        this.client.off("welcome", this._onWelcome);
        this.client.off("keepalive", this._onEventOrKeepalive);
        this.client.off("message", this._onEventOrKeepalive);
        this.client.off("session_reconnect", this._onEventOrKeepalive);
        this.client.off("revocation", this._onEventOrKeepalive);
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
