import { sleep } from "../../utils/timeUtils.js";

export class chatClient {
    constructor(authService, botUserId) {
        this.authService = authService;
        this.botUserId = botUserId;
    }

    async sendMessage(message, chatUserId) {
        try {
            const response = await fetch(
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

            if (response.status === 401 || response.status === 403) {
                await this.authService.refreshOAuthToken();
                return false;
            } else if (response.status === 429) {
                console.log("Rate limit reached, retrying in 2 seconds...");
                await sleep(2000);
                return false;
            } else if (!response.ok) {
                let data = await response.json();
                console.error("Failed to send chat message");
                console.error(data);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Network or other error:", error);
            return false;
        }
    }
}
