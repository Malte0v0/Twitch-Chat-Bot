import { EventSubError } from "../errors/errors";

export class EventSubClient {
    constructor() {
        this.clientSecret = process.env.CLIENT_SECRET;
        this.clientId = process.env.CLIENT_ID;
        this.botUserId = process.env.BOT_USER_ID;
        this.chatUserId = process.env.CHAT_USER_ID;
    }

    async registerEventSubListeners(sessionId) {
        const oauthToken = process.env.OAUTH_TOKEN;

        let response;
        try {
            console.log(`${sessionId} Registering Twitch eventsub`);
            response = await fetch(
                "https://api.twitch.tv/helix/eventsub/subscriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + oauthToken,
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
        } catch (error) {
            throw new EventSubError(
                "Error when registering Twitch eventsub",
                error,
            );
        }

        const data = await response.json();

        if (response.status !== 202) {
            throw new EventSubError(
                `${sessionId} Registering Twitch eventsub failed`,
                data,
            );
        }
    }
}
