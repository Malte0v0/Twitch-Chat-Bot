export class TwitchClient extends EventEmitter {
    constructor() {
        super();
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

        client.on("open", () => {
            console.log(
                `Twitch WebSocket ${this.sessionId || "new"} connection opened, url: ${url}`,
            );
            clearInterval(connectTimeout);
            this.emit("open");
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
            this.emit("close", (code, reason));
        });
    }

    async handleMessages(data) {
        // Update time since last message
        this.latestWsMessage = Date.now();

        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        this.emit(data.metadata.message_type);
        // // Handle message
        // switch (data.metadata.message_type) {
        //     case "session_welcome":
        //         // Handle an eventual reconnect situation
        //         if (this.oldWSClient) {
        //             console.log("Closing old Twitch WebSocket", this.sessionId);
        //             this.cleanupOldConnection();
        //         }

        //         this.sessionId = data.payload.session.id;
        //         this.keepaliveTimeoutSeconds =
        //             data.payload.session.keepalive_timeout_seconds;

        //         if (!this.isReconnectEvent) {
        //             console.log(
        //                 "Registering EventSub listeners for new connection",
        //             );
        //             await this.registerEventSubListeners();
        //         }

        //         this.isReconnectEvent = false;

        //         await this.startHeartbeatMonitor();
        //         break;
        //     case "session_keepalive":
        //         // console.log("Heartbeat", this.sessionId)
        //         break;
        //     case "notification":
        //         switch (data.metadata.subscription_type) {
        //             case "channel.chat.message":
        //                 this.emit("message", data);
        //                 break;
        //         }
        //         break;
        //     case "session_reconnect":
        //         console.warn(
        //             "Recieved reconnection message from Twitch EventSub WebSocket",
        //         );
        //         const reconnectURL = data.payload.session.reconnect_url;
        //         this.isReconnectEvent = true;
        //         this.reconnect(reconnectURL);
        //         break;
        //     case "revocation":
        //         console.warn(
        //             "Recieved revocation message from Twitch EventSub WebSocket",
        //             data.payload,
        //         );
        //         this.reconnect();
        //         break;
        //     default:
        //         console.warn(
        //             "Unhandled message type",
        //             data.metadata.message_type,
        //         );
        //         break;
        // }
    }
}
