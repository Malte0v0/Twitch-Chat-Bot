import { TwitchClient } from "./twitchClient";

export class TwitchManager {
    constructor() {
        this.reconnectInterval = 1000;

        this.oldWSClient = null;
        this.sessionId = null;

        this.keepaliveTimeoutSeconds = null;
        this.latestWsMessage = Date.now();

        this.isReconnectEvent = false;
        this.reconnecting = false;

        this.keepaliveInterval = null;

        this.defaultWSUrl = "wss://eventsub.wss.twitch.tv/ws";

        this.twitchClient = new TwitchClient();
    }

    connect() {
        this.twitchClient.connect(this.defaultWSUrl);
    }

    // this.reconnecting = false;
    // this.resetheartbeatMonitor.ReconnectInterval();

    reconnect(url = this.defaultWSUrl) {
        // Reconnect debounce
        if (this.reconnecting) {
            console.log("Reconnection already in progress");
            return;
        }
        this.reconnecting = true;

        // Stop heartbeat monitor
        this.clearHeartbeatMonitor();

        if (this.isReconnectEvent) {
            // Make a reference to the old WebSocket client
            this.oldWSClient = this.mainWebSocketClient;
        } else {
            // Close existing connection
            this.cleanupAll();
        }

        console.log(
            `Twitch WebSocket ${this.sessionId || "unknown"} reconnecting with url: ${url}`,
        );
        // Make a new WebSocket client
        this.connect(url);
    }

    disconnect() {
        this.twitchClient.disconnect();
    }

    //     if (client === this.mainWebSocketClient && code !== 1000) {
    //     this.reconnecting = false;
    //     this.heartbeatMonitor.reconnectInterval = Math.min(
    //         this.heartbeatMonitor.reconnectInterval * 2,
    //         60000,
    //     );
    //     console.warn(
    //         `Trying to reconnect in ${this.heartbeatMonitor.reconnectInterval / 1000}s...`,
    //     );
    //     setTimeout(() => {
    //         this.reconnect();
    //     }, this.heartbeatMonitor.reconnectInterval);
    // }

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
