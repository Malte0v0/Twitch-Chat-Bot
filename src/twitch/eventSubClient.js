export class EventSubClient {
    constructor(authService, chatService, sessionId) {
        this.authService = authService;
        this.chatService = chatService;
        this.sessionId = sessionId;
    }

    async registerEventSubListeners() {
        try {
            let response = await fetch(
                "https://api.twitch.tv/helix/eventsub/subscriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + this.authService.oauthToken,
                        "Client-Id": this.authService.clientId,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "channel.chat.message",
                        version: "1",
                        condition: {
                            broadcaster_user_id: this.chatService.chatId,
                            user_id: this.chatService.botId,
                        },
                        transport: {
                            method: "websocket",
                            session_id: this.sessionId,
                        },
                    }),
                },
            );

            const data = await response.json();

            if (response.status !== 202) {
                console.error(
                    "Failed to subscribe to channel.chat.message. API call returned status code " +
                        response.status,
                );
                console.error(data);
            } else {
                console.log(
                    `Subscribed to channel.chat.message [${data.data[0].id}]`,
                );
            }
        } catch (error) {
            console.warn("Error registering EventSub listener:", error);

            setTimeout(() => {
                this.reconnect();
            }, 5000);
        }
    }
}
