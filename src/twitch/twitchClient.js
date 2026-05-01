import WebSocket from "ws";
import { getHumanTimeFromDate } from "../utils/timeUtils.js";
import { sanitizeInput } from "../utils/inputUtils.js";
import { event } from "../utils/events.js";

export class TwitchClient {
    constructor(
        authService,
        chatService,
        nitterService,
        commands,
        commandPrefix,
    ) {
        this._authService = authService;
        this._chatService = chatService;
        this._nitterService = nitterService;
        this._commands = commands;
        this._commandPrefix = commandPrefix;

        this._defaultWebSocketURL = "wss://eventsub.wss.twitch.tv/ws";
        this.connect();
        this._oldWebSocketClient = null;
        this._websocketSessionID = null;

        this._keepaliveTimeoutSeconds = null;
        this._latestWsMessage = Date.now();

        this._commandRegex = new RegExp(`^(?:\\${this._commandPrefix})(\\w+)`);

        this._isReconnectEvent = false;
        this._reconnecting = false;
        this._reconnectInterval = 1000;
        this._keepaliveInterval = null;
    }

    connect(url = this._defaultWebSocketURL) {
        console.log("Connecting to Twitch WebSocket with:", url);
        const client = new WebSocket(url);
        const connectTimeout = setTimeout(() => {
            if (client.readyState === WebSocket.CONNECTING) {
                console.warn("Connection timeout");
                client.close();
            }
        }, 10000);

        this._mainWebSocketClient = client;

        client.on("open", () => {
            console.log(
                `Twitch WebSocket ${this._websocketSessionID || "new"} connection opened, url: ${url}`,
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
                        // First, print the message to the program's console.
                        console.log(
                            `MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`,
                        );
                        // Sanitize the message text
                        data.payload.event.message.text = sanitizeInput(
                            data.payload.event.message.text,
                        );
                        const messageText =
                            data.payload.event.message.text.trim();
                        const sender = data.payload.event.chatter_user_login;

                        if (["ggxgang_bank"].includes(sender)) return;

                        // AFK AND SLEEPING START
                        // ON SIGHT REMINDERS START
                        event.emit("user_appeared", data);
                        // ON SIGHT REMINDERS END
                        // AFK AND SLEEPING END

                        // COMMANDS START
                        try {
                            if (
                                messageText
                                    .toLowerCase()
                                    .startsWith(this._commandPrefix)
                            ) {
                                // The message is a command
                                const match = messageText
                                    .toLowerCase()
                                    .match(this._commandRegex);
                                if (match && match[1]) {
                                    const command = match[1];
                                    await this._commands.handleCommand(
                                        command,
                                        messageText,
                                        data,
                                    );
                                }
                            }
                        } catch (error) {
                            console.error(error);
                        }
                        // COMMANDS END

                        // NITTER START
                        // this._nitterService.sendNitterIfX(messageText);
                        // NITTER END
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
