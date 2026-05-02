const FIFTEEN_SECONDS_IN_MS = 15 * 1000;

export class HeartrateMonitor {
    constructor(client, keepaliveTimeoutSeconds) {
        this.lastKeepaliveMessage = null;
        this.keepaliveTimeoutSeconds = keepaliveTimeoutSeconds;

        this.heartbeat = null;
    }

    startListening() {
        client.on("keepalive", () => {
            this.lastKeepaliveMessage = Date.now();
        });
    }

    stopListening() {
        client.off("keepalive");
    }

    start() {
        this.startListening();
        this.heartbeat = setInterval(() => {
            if (
                Date.now() - this.lastKeepaliveMessage >
                FIFTEEN_SECONDS_IN_MS
            ) {
                client.reconnect();
            }
        }, 5000);
    }

    stop() {
        this.stopListening();
        this.heartbeat = null;
    }

    reset() {
        this.stop();
        this.start();
    }
}
