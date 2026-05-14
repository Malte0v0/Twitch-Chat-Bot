import { ChatError } from "../../errors/errors.js";

export class chatClient {
    constructor(authService, botUserId) {
        this.authService = authService;
        this.botUserId = botUserId;
    }

    async sendMessage(message, chatUserId, attempts) {
        let response;
        try {
            response = await fetch(
                "https://api.twitch.tv/helix/chat/messages",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + this.authService.oauthToken,
                        "Client-Id": this.authService.clientId,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        broadcaster_id: chatUserId,
                        sender_id: this.botUserId,
                        message: message,
                    }),
                },
            );
        } catch (error) {
            throw new ChatError("Fetch failed", error);
        }

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            await this.authService.refreshOAuthToken();
            if (attempts > 1) {
                throw new ChatError(
                    "Failed to send Twitch chat message even after retrying",
                    data,
                );
            }
            await this.sendMessage(message, chatUserId, attempts + 1);
        } else if (!response.ok) {
            throw new ChatError("Failed to send Twitch chat message", data);
        }

        return data;
    }
}
