import WebSocket from "ws";
import { getHumanTimeFromDate } from "../utils/timeUtils.js";
import { sanitizeInput } from "../utils/inputUtils.js";

export class TwitchService {
    constructor(authService, chatService, commands, commandPrefix) {
        this._authService = authService;
        this._chatService = chatService;
        this._commands = commands;
        this._commandPrefix = commandPrefix;
        
        this._defaultWebSocketURL = "wss://eventsub.wss.twitch.tv/ws";
        this._websocketClient = this.start();
        
        this._websocketSessionID = null;

        this._keepaliveTimeoutSeconds = null;
        this._latestWsMessage = Date.now();

        this._commandRegex = new RegExp(`^(?:\\${this._commandPrefix})(\\w+)`);

        this._isReconnect = false;
    }

    start(url=this._defaultWebSocketURL) {
        const client = new WebSocket(url);

        client.on("error", (error) => {
            console.warn("Twitch WebSocket error:", error);
            this.cleanup();
        });

        client.on("open", () => {
            console.log("Twitch WebSocket connection opened, url:", url);
        });

        client.on("message", async (data) => {
            try {
                await this.handleMessages(JSON.parse(data.toString()));
            } catch (error) {
                console.error("Error handling Twitch websocket message:", error);
            }
        });

        client.on("close", (code, reason) => {
            console.log(`Twitch WebSocket closed: ${code} ${reason.toString()}`);
            this.cleanup();

            if (code === 1000) {
                setTimeout(() => {
                    this.reconnect(url);
                }, 1000);
            }
        });

        return client;
    }

    reconnect(url=this._defaultWebSocketURL) {
        // Reconnect debounce
        if (this._reconnecting) return;
        this._reconnecting = true;

        this.cleanup();

        // Make a reference to the old WebSocket client
        this._oldWebSocketClient = this._websocketClient;

        console.log("Twitch WebSocket reconnecting with url:", url);
        // Make a new WebSocket client
        this._websocketClient = this.start(url);

        // After a new connection has been opened, not longer connecting
        setTimeout(() => {
            this._reconnecting = false;
        }, 5000);
    }

    cleanup() {
        if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
            this._keepaliveInterval = null;
        }
    }

    async handleMessages(data) {
        // Update time since last message
        this._latestWsMessage = Date.now();

        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        // Handle message
        switch(data.metadata.message_type) {
            case "session_welcome":
                // Handle an eventual reconnect situation
                if (this._oldWebSocketClient) {
                    console.log("Closing old Twitch WebSocket");
                    this._oldWebSocketClient.close();
                    this._oldWebSocketClient = null;
                }

                this._websocketSessionID = data.payload.session.id;
                this._keepaliveTimeoutSeconds = data.payload.session.keepalive_timeout_seconds;

                if (!this._isReconnect) {
                    await this.registerEventSubListeners();
                }
                this._isReconnect = false;
                
                await this.startHeartbeatMonitor();
                break;
            case "session_keepalive":
                // console.log("Heartbeat", this._websocketSessionID)
                break;
            case "notification":
                switch (data.metadata.subscription_type) {
                    case "channel.chat.message":
                        // First, print the message to the program's console.
                        console.log(`MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);
                        // Sanitize the message text
                        data.payload.event.message.text = sanitizeInput(data.payload.event.message.text);
                        let messageText = data.payload.event.message.text.trim();

                        // AFK AND SLEEPING START
                        await this._commands.handleAfkAsleep(messageText, data);
                        // AFK AND SLEEPING END
                        
                        // COMMANDS START
                        try {
                            if (messageText.toLowerCase().startsWith(this._commandPrefix)) {
                                // The message is a command
                                const match = messageText.toLowerCase().match(this._commandRegex);

                                if (match && match[1]) {
                                    const command = match[1];
                                    await this._commands.handleCommand(command, messageText, data);
                                }
                            }
                        } catch (error) {
                            console.error(error);
                        }
                        // COMMANDS END
                        break;
                }
                break;
            case "session_reconnect":
                console.warn("Recieved reconnection message from Twitch EventSub WebSocket");
                const reconnectURL = data.payload.session.reconnect_url;
                this._isReconnect = true;
                this.reconnect(reconnectURL);
                break;
            case "revocation":
                console.warn("Twitch WebSocket EventSub revocation message recieved", data.payload);
                break;
            default:
                console.warn("Unhandled message type", data.metadata.message_type);
        }
    }

    async registerEventSubListeners() {
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
                    user_id: this._chatService.botUserId
                },
                transport: {
                    method: "websocket",
                    session_id: this._websocketSessionID
                }
            })
        });

        if (response.status != 202) {
            let data = await response.json();
            console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
            console.error(data);
            process.exit(1);
        } else {
            const data = await response.json();
            console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
        }
    }

    async startHeartbeatMonitor() {
        this.cleanup();

        this._keepaliveInterval = setInterval(() => {
            const timeSinceLastWsMessage = Date.now() - this._latestWsMessage;
            if (timeSinceLastWsMessage > this._keepaliveTimeoutSeconds*1000 + 5000) {
                // Assume connection is dead and reconnect
                this.reconnect();
            }
        }, 5*1000); // Check every 5 seconds
    }
}