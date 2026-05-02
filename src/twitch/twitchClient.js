export class TwitchClient extends EventEmitter {
    constructor() {
        super();

        this.authService = authService;
        this.chatService = chatService;
        this.nitterService = nitterService;

        this.oldWSClient = null;
        this.sessionId = null;

        this.keepaliveTimeoutSeconds = null;
        this.latestWsMessage = Date.now();

        this.isReconnectEvent = false;
        this.reconnecting = false;
        this.reconnectInterval = 1000;
        this.keepaliveInterval = null;

        this.defaultWSUrl = "wss://eventsub.wss.twitch.tv/ws";
    }

    connect(url = this.defaultWSUrl) {
        console.log("Connecting to Twitch WebSocket with:", url);
        const client = new WebSocket(url);
        const connectTimeout = setTimeout(() => {
            if (client.readyState === WebSocket.CONNECTING) {
                console.warn("Connection timeout");
                client.close();
            }
        }, 10000);

        this.mainWebSocketClient = client;

        client.on("open", () => {
            console.log(
                `Twitch WebSocket ${this.sessionId || "new"} connection opened, url: ${url}`,
            );
            clearInterval(connectTimeout);
            this.reconnecting = false;
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
                `Twitch WebSocket ${this.sessionId || "unknown"} error: ${error}`,
            );
            client.close(4008);
        });

        client.on("close", (code, reason) => {
            console.log(
                `Twitch WebSocket ${this.sessionId || "unknown"} closed: ${code} ${reason.toString()}`,
            );

            if (client === this.mainWebSocketClient && code !== 1000) {
                this.reconnecting = false;
                this.reconnectInterval = Math.min(
                    this.reconnectInterval * 2,
                    60000,
                );
                console.warn(
                    `Trying to reconnect in ${this.reconnectInterval / 1000}s...`,
                );
                setTimeout(() => {
                    this.reconnect();
                }, this.reconnectInterval);
            }
        });
    }

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

    async handleMessages(data) {
        // Update time since last message
        this.latestWsMessage = Date.now();

        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        // Handle message
        switch (data.metadata.message_type) {
            case "session_welcome":
                // Handle an eventual reconnect situation
                if (this.oldWSClient) {
                    console.log("Closing old Twitch WebSocket", this.sessionId);
                    this.cleanupOldConnection();
                }

                this.sessionId = data.payload.session.id;
                this.keepaliveTimeoutSeconds =
                    data.payload.session.keepalive_timeout_seconds;

                if (!this.isReconnectEvent) {
                    console.log(
                        "Registering EventSub listeners for new connection",
                    );
                    await this.registerEventSubListeners();
                }

                this.isReconnectEvent = false;

                await this.startHeartbeatMonitor();
                break;
            case "session_keepalive":
                // console.log("Heartbeat", this.sessionId)
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
                this.isReconnectEvent = true;
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
