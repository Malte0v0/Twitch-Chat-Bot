import { getHumanTimeFromDate } from "../utils/timeUtils.js";
import { sanitizeInput } from "../utils/inputUtils.js";
import WebSocket from "ws";

export class WebSocketService {
    constructor(authService, chatService, commands, commandPrefix) {
        this._authService = authService;
        this._chatService = chatService;
        this._commands = commands;

        this._commandPrefix = commandPrefix;
        
        this._defaultWebsocketUrl = "wss://eventsub.wss.twitch.tv/ws";
        this._websocketSessionID = null;
        this._websocketClient = this.start(this._defaultWebsocketUrl);

        this._lastKeepalive = Date.now();
        this._keepaliveTimeoutMilliseconds = 10 * 1000;

    }

    start(websocketUrl=this._defaultWebsocketUrl) {
        let websocketClient = new WebSocket(websocketUrl);

        websocketClient.on("error", (error) => {
            console.error(error);
        });

        websocketClient.on("open", () => {
            console.log("WebSocket connection opened to " + websocketUrl);
        });

        websocketClient.on("close", (code, reason) => {
            console.warn("Websocket closed:", code, reason);

            let newUrl = websocketUrl;

            if (code === 4007) {
                console.warn("Invalid reconnect URL, falling back to default WebSocket URL")
                newUrl = this._defaultWebsocketUrl;
            }

            setTimeout(() => {
                this.reconnect(newUrl);
            }, 5_000);
        });

        websocketClient.on("message", async (data) => {
            try {
                await this.handleMessage(JSON.parse(data.toString()));
            } catch (error) {
                console.error("Error handling Twitch websocket message:", error);
            }
        });

        return websocketClient;
    }

    reconnect(websocketUrl=this._defaultWebsocketUrl) {
        clearInterval(this._keepaliveInterval);
        // Close the old websocketClient
        this._websocketClient.close();
        // Start a new one
        this._websocketClient = this.start(websocketUrl)
    }

    async handleMessage(data) {
        this._lastKeepalive = Date.now();
        
        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        switch (data.metadata.message_type) {
            case "session_welcome": // First message you get from the WebSocket server when connecting
                this._websocketSessionID = data.payload.session.id; // Register the Session ID it gives us
                this._keepaliveTimeoutMilliseconds = data.payload.session.keepalive_timeout_seconds * 1000;

                // Listen to EventSub, which joins the chatroom from your bot's account
                await this.registerEventSubListeners();

                // Start checking for dead connection
                this.setupKeepaliveWatcher();
                break;
            case "session_reconnect":
                const reconnectUrl = data.payload.session.reconnect_url;
                this.reconnect(reconnectUrl);
                break;
            case "notification": // An EventSub notification has occurred, such as channel.chat.message
                switch (data.metadata.subscription_type) {
                    case "channel.chat.message":
                        // First, print the message to the program's console.
                        console.log(`MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);
                        // Sanitize the message text
                        if (data?.payload?.event?.message?.text) {
                            data.payload.event.message.text = sanitizeInput(data.payload.event.message.text);
                        }
                        let messageText = data.payload.event.message.text.trim();

                        // AFK AND SLEEPING START
                        await this._commands.handleAfkAsleep(messageText, data);
                        // AFK AND SLEEPING END
                        
                        // COMMANDS START
                        try {
                            if (messageText.toLowerCase().startsWith(this._commandPrefix)) {
                                // The message is a command
                                const pattern = new RegExp(`^(?:\\${this._commandPrefix})(\\w+)`);
                                const command = messageText.toLowerCase().match(pattern)[1];

                                await this._commands.handleCommand(command, messageText, data);
                            }
                        } catch (error) {
                            console.error(error);
                        }
                        // COMMANDS END
                        break;
                }
                break;
            case "session_keepalive":
                break;
            case "revocation":
                break;
            default:
                console.warn("Unhandled message type", data.metadata.message_type);
        }
    }

    async registerEventSubListeners() {
        // Register channel.chat.message
        let response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + this._authService.oauthToken,
                "Client-Id": this._authService.clientId,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "channel.chat.message",
                version: "1",
                condition: {
                    broadcaster_user_id: this._chatService.chatChannelUserId,
                    user_id: this._chatService.botUserId,
                },
                transport: {
                    method: "websocket",
                    session_id: this._websocketSessionID
                }
            })
        });

        let data = await response.json();
        if (response.status != 202) {
            console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
            console.error(data);
            process.exit(1);
        } else {
            console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
        }
    }

    setupKeepaliveWatcher() {
        if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
        }

        this._keepaliveInterval = setInterval(() => {
            if ((Date.now() - this._lastKeepalive) > this._keepaliveTimeoutMilliseconds+5000) { // +5000 just to add a 5 second buffer
                console.warn("Twitch websocket connection presumed dead, reconnecting...");
                this.reconnect();
            }
        }, this._keepaliveTimeoutMilliseconds);
    }
}