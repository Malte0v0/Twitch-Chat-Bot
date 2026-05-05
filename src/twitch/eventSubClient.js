export class EventSubClient {
    constructor() {
        this.oauthToken = process.env.OAUTH_TOKEN;
        this.clientSecret = process.env.CLIENT_SECRET;
        this.clientId = process.env.CLIENT_ID;
        this.botUserId = process.env.BOT_USER_ID;
        this.chatUserId = process.env.CHAT_USER_ID;
    }

    async registerEventSubListeners(sessionId) {
        try {
            console.log(sessionId);
            let response = await fetch(
                "https://api.twitch.tv/helix/eventsub/subscriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + this.oauthToken,
                        "Client-Id": this.clientId,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        type: "channel.chat.message",
                        version: "1",
                        condition: {
                            broadcaster_user_id: this.chatUserId,
                            user_id: this.botUserId,
                        },
                        transport: {
                            method: "websocket",
                            session_id: sessionId,
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
        }
    }
}
