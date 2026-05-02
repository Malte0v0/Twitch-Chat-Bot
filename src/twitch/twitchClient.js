export class TwitchClient extends EventEmitter {
    constructor(url) {
        super();

        this.url = url;

        this._oldWebSocketClient = null;
        this._websocketSessionID = null;

        this._keepaliveTimeoutSeconds = null;
        this._latestWsMessage = Date.now();

        this._isReconnectEvent = false;
        this._reconnecting = false;
        this._reconnectInterval = 1000;
        this._keepaliveInterval = null;
    }

    connect() {
        console.log("Connecting to Twitch WebSocket with:", this.url);
        const client = new WebSocket(this.url);
        const connectTimeout = setTimeout(() => {
            if (client.readyState === WebSocket.CONNECTING) {
                console.warn("Connection timeout");
                client.close();
            }
        }, 10000);

        this._mainWebSocketClient = client;

        client.on("open", () => {
            console.log(
                `Twitch WebSocket ${this._websocketSessionID || "new"} connection opened, url: ${this.url}`,
            );
            clearInterval(connectTimeout);
            this._reconnecting = false;
            this.resetReconnectInterval();
        });

        client.on("message", async (data) => {
            try {
                await this.handleMessages(JSON.parse(data.toString()));
            } catch (error) {
                console.error(
                    "Error handling Twitch websocket message:",
                    error,
                );
            }
        });

        client.on("error", (error) => {
            console.warn(
                `Twitch WebSocket ${this._websocketSessionID || "unknown"} error: ${error}`,
            );
            client.close(4008);
        });

        client.on("close", (code, reason) => {
            console.log(
                `Twitch WebSocket ${this._websocketSessionID || "unknown"} closed: ${code} ${reason.toString()}`,
            );

            if (client === this._mainWebSocketClient && code !== 1000) {
                this._reconnecting = false;
                this._reconnectInterval = Math.min(
                    this._reconnectInterval * 2,
                    60000,
                );
                console.warn(
                    `Trying to reconnect in ${this._reconnectInterval / 1000}s...`,
                );
                setTimeout(() => {
                    this.reconnect();
                }, this._reconnectInterval);
            }
        });
    }

    reconnect(url = this._defaultWebSocketURL) {
        // Reconnect debounce
        if (this._reconnecting) {
            console.log("Reconnection already in progress");
            return;
        }
        this._reconnecting = true;

        // Stop heartbeat monitor
        this.clearHeartbeatMonitor();

        if (this._isReconnectEvent) {
            // Make a reference to the old WebSocket client
            this._oldWebSocketClient = this._mainWebSocketClient;
        } else {
            // Close existing connection
            this.cleanupAll();
        }

        console.log(
            `Twitch WebSocket ${this._websocketSessionID || "unknown"} reconnecting with url: ${url}`,
        );
        // Make a new WebSocket client
        this.connect(url);
    }

    async handleMessages(data) {
        // Update time since last message
        this._latestWsMessage = Date.now();

        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        // Handle message
        switch (data.metadata.message_type) {
            case "session_welcome":
                // Handle an eventual reconnect situation
                if (this._oldWebSocketClient) {
                    console.log(
                        "Closing old Twitch WebSocket",
                        this._websocketSessionID,
                    );
                    this.cleanupOldConnection();
                }

                this._websocketSessionID = data.payload.session.id;
                this._keepaliveTimeoutSeconds =
                    data.payload.session.keepalive_timeout_seconds;

                if (!this._isReconnectEvent) {
                    console.log(
                        "Registering EventSub listeners for new connection",
                    );
                    await this.registerEventSubListeners();
                }

                this._isReconnectEvent = false;

                await this.startHeartbeatMonitor();
                break;
            case "session_keepalive":
                // console.log("Heartbeat", this._websocketSessionID)
                break;
            case "notification":
                switch (data.metadata.subscription_type) {
                    case "channel.chat.message":
                        this.emit("message", data);
                        break;
                }
                break;
            case "session_reconnect":
                console.warn(
                    "Recieved reconnection message from Twitch EventSub WebSocket",
                );
                const reconnectURL = data.payload.session.reconnect_url;
                this._isReconnectEvent = true;
                this.reconnect(reconnectURL);
                break;
            case "revocation":
                console.warn(
                    "Recieved revocation message from Twitch EventSub WebSocket",
                    data.payload,
                );
                this.reconnect();
                break;
            default:
                console.warn(
                    "Unhandled message type",
                    data.metadata.message_type,
                );
                break;
        }
    }
}
