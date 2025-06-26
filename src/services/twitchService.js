import WebSocket from "ws";
import { getHumanTimeFromDate } from "../utils/timeUtils.js";
import { sanitizeInput } from "../utils/inputUtils.js";

export class TwitchService {
    constructor(authService, chatService, commands, commandPrefix) {
        this._authService = authService;
        this._chatService = chatService;
        this._commands = commands;
        this._commandPrefix = commandPrefix;
        
        this._defaultWebSocketURL = "ws://127.0.0.1:8080/ws";
        // this._defaultWebSocketURL = "wss://eventsub.wss.twitch.tv/ws";
        this._websocketClient = this.start();
        
        this._websocketSessionID = null;

        this._keepaliveTimeoutSeconds = null;
        this._latestWsMessage = Date.now();
    }

    start(url=this._defaultWebSocketURL) {
        const client = new WebSocket(url);

        client.on("error", (error) => {
            console.warn("Twitch WebSocket error:", error);
        });

        client.on("open", () => {
            console.log("Twitch WebSocket connection opened, url:", url);
        });

        client.on("message", (data) => {
            this.handleMessages(JSON.parse(data.toString())).catch((error) => {console.warn(error)});
        });

        client.on("close", (code, reason) => {
            console.warn("Twitch WebSocket closed:", code, reason.toString());
        });

        return client;
    }

    reconnect(url=this._defaultWebSocketURL) {
        if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
        }
        // Make a reference to the old WebSocket client
        this._oldWebSocketClient = this._websocketClient;

        console.log("Twitch WebSocket reconnecting with url:", url);
        // Make a new WebSocket client
        this._websocketClient = this.start(url);
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
                    this._oldWebSocketClient = undefined;
                }

                this._websocketSessionID = data.payload.session.id;
                this._keepaliveTimeoutSeconds = data.payload.session.keepalive_timeout_seconds;

                // this.registerEventSubListeners().catch((error) => {console.warn(error)});
                await this.startHeartbeatMonitor();
                break;
            case "session_keepalive":
                console.log("Heartbeat", this._websocketSessionID)
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
            case "session_reconnect":
                console.warn("Recieved reconnection message from Twitch EventSub WebSocket");
                const reconnectURL = data.payload.session.reconnect_url;
                this.reconnect(reconnectURL);
                break;
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
        if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
        }

        this._keepaliveInterval = setInterval(() => {
            const timeSinceLastWsMessage = Date.now() - this._latestWsMessage;
            if (timeSinceLastWsMessage > this._keepaliveTimeoutSeconds*1000 + 5000) {
                // Assume connection is dead and reconnect
                this.reconnect();
            }
        }, 5*1000); // Check every 5 seconds
    }
}