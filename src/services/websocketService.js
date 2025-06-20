import { getHumanTimeFromDate, msToHuman } from "../utils/timeUtils.js";
import { sanitizeInput } from "../utils/inputUtils.js";
import WebSocket from "ws";

export class WebSocketService {
    constructor(authService, chatService, statusService, reminderScheduler, weatherService, commandPrefix) {
        this._authService = authService;
        this._chatService = chatService;
        this._statusService = statusService;
        this._reminderScheduler = reminderScheduler;
        this._weatherService = weatherService;

        this._commandPrefix = commandPrefix;
        
        this._eventsubWebsocketUrl = "wss://eventsub.wss.twitch.tv/ws";

        this._websocketSessionID = null;
        this._websocketClient = this.start(this._eventsubWebsocketUrl);
    }

    start(websocketUrl=this._eventsubWebsocketUrl) {
        let websocketClient = new WebSocket(websocketUrl);

        websocketClient.on("error", console.error);

        websocketClient.on("open", () => {
            console.log("WebSocket connection opened to " + websocketUrl);
        });

        websocketClient.on("close", (code, reason) => {
            console.warn("Websocket closed:", code, reason);
        });

        websocketClient.on("ping", () => {
            websocketClient.pong();
        });

        websocketClient.on("message", (data) => {
            this.handleMessage(JSON.parse(data.toString()));
        });

        return websocketClient;
    }

    async handleMessage(data) {
        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        switch (data.metadata.message_type) {
            case "session_welcome": // First message you get from the WebSocket server when connecting
                this._websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

                // Listen to EventSub, which joins the chatroom from your bot's account
                await this.registerEventSubListeners();
                break;
            case "session_reconnect":
                const newWebsocketUrl = data.payload.session.reconnect_url;

                // Close the old websocketClient
                this._websocketClient.close();
                // Start a new one
                this._websocketClient = this.start(newWebsocketUrl);
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
                        let messageText = data.payload.event.message.text.trim()

                        // AFK AND SLEEPING START
                        try {
                            const userId = data.payload.event.chatter_user_id;
                            const userLogin = data.payload.event.chatter_user_login;
                            const status = this._statusService.checkChatterStatus(userId);
                            
                            const asleepOrAfkUsers = this._statusService.getAfkOrAsleepUsernames();
                            for (const user of asleepOrAfkUsers) {
                                if (messageText.toLowerCase().startsWith(`@${user}`)) {
                                    const asleepOrAfkUserStatus = this._statusService.checkChatterStatusByName(user);
                                    if (asleepOrAfkUserStatus.isAfk) {
                                        await this._chatService.sendChatMessage(`${userLogin}, ${user} is currently AFK${asleepOrAfkUserStatus.message}`)
                                    } else if (asleepOrAfkUserStatus.isAsleep) {
                                        await this._chatService.sendChatMessage(`${userLogin}, ${user} is currently sleeping${asleepOrAfkUserStatus.message}`)
                                    }
                                }
                            }

                            if (status && (status.isAfk || status.isAsleep)) {
                                const timeSince = msToHuman(Date.now() - status.time); 
                                
                                if (status.isAfk) {
                                    this._statusService.toggleAfkStatus(userId);
                                    await this._chatService.sendChatMessage(`${userLogin} is no longer AFK${status.message} (${timeSince})`);
                                } else if (status.isAsleep) {
                                    this._statusService.toggleAsleepStatus(userId);
                                    await this._chatService.sendChatMessage(`${userLogin} is no longer sleeping${status.message} (${timeSince})`);
                                }
                                break;
                            }
                        } catch (error) {
                            console.error(error);
                            break;
                        }
                        // AFK AND SLEEPING END
                        
                        // COMMANDS START
                        try {
                            if (messageText.toLowerCase().startsWith(this._commandPrefix)) {
                                // The message is a command
                                if (messageText.startsWith(this._commandPrefix + "remind")) {
                                    await this._reminderScheduler.remindCommand(messageText, data);
                                } else if (messageText.startsWith(this._commandPrefix + "weather")) {
                                    await this._weatherService.weatherCommand(messageText, data).catch(error => {
                                        console.error("Weather command failed:", error);
                                    })
                                } else if (messageText.startsWith(this._commandPrefix + "afk")) {
                                    await this._statusService.setUserStatus(messageText, data, "afk");
                                } else if (messageText.startsWith(this._commandPrefix + "sleep")) {
                                    await this._statusService.setUserStatus(messageText, data, "sleep");
                                }
                            }
                        } catch (error) {
                            await this._chatService.sendChatMessage('Invalid format. The correct format is: "$remindme in [time] [message]" or "$remind [username] in [time] [message]"')
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

}