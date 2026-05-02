export class HeartbeatMonitor {
    cleanupAll() {
        this.clearHeartbeatMonitor();
        this.cleanupMainConnection();
        this.cleanupOldConnection();
    }

    clearHeartbeatMonitor() {
        if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
            this._keepaliveInterval = null;
        }
    }

    cleanupMainConnection() {
        if (this._mainWebSocketClient) {
            console.log("Cleaning up main Twitch WebSocket connection");
            this._mainWebSocketClient.removeAllListeners();

            if (
                this._mainWebSocketClient.readyState === WebSocket.OPEN ||
                this._mainWebSocketClient.readyState === WebSocket.CONNECTING
            ) {
                this._mainWebSocketClient.close(1000, "Cleaning up");
            }

            this._mainWebSocketClient = null;
        }
    }

    cleanupOldConnection() {
        if (this._oldWebSocketClient) {
            console.log("Cleaning up old Twitch WebSocket connection");
            this._oldWebSocketClient.removeAllListeners();

            if (
                this._oldWebSocketClient.readyState === WebSocket.OPEN ||
                this._oldWebSocketClient.readyState === WebSocket.CONNECTING
            ) {
                this._oldWebSocketClient.close(
                    1000,
                    "Cleaning up old connection",
                );
            }

            this._oldWebSocketClient = null;
        }
    }

    resetReconnectInterval() {
        this._reconnectInterval = 1000;
    }

    async startHeartbeatMonitor() {
        this.clearHeartbeatMonitor();

        this._keepaliveInterval = setInterval(() => {
            const timeSinceLastWsMessage = Date.now() - this._latestWsMessage;
            const timeout = this._keepaliveTimeoutSeconds * 1000 + 5000;

            if (timeSinceLastWsMessage > timeout) {
                // Assume connection is dead and reconnect
                console.warn(
                    `Twitch WebSocket connection is presumed dead (${timeSinceLastWsMessage}ms since last message), reconnecting...`,
                );
                this.reconnect();
            }
        }, 5000); // Check every 5 seconds
    }
}
