import { sleep } from "../utils/timeUtils.js"
import { splitLength } from "../utils/inputUtils.js"

export class ChatService {
    constructor(authService) {
        this._authService = authService;
        this._botUserId = "1225554271";
        // p5vrq 1251520948
        // 527762906
        this._chatChannelUserId = process.env.CHAT_CHANNEL_USER_ID;
    }

    get botUserId() {return this._botUserId;}

    get chatChannelUserId() {return this._chatChannelUserId;}

    async sendChatMessage(chatMessage, channelUserId=this._chatChannelUserId) {
        const messages = chatMessage.length > 500
            ? splitLength(chatMessage, 500)
            : [chatMessage];

        for (const message of messages) {
            let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._authService.oauthToken,
                    "Client-Id": this._authService.clientId,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    broadcaster_id: channelUserId,
                    sender_id: this._botUserId,
                    message: message
                })
            });

            
            if (response.status === 401 || response.status === 403) {
                await this._authService.refreshOAuthToken();
                // Bug, would resend already sent messages if it happens on any other message than the first
                await this.sendChatMessage(message, channelUserId);
            } else if (response.status === 429) {
                console.log("Rate limit reached, retrying in 2 seconds...");
                await sleep(2000);
                await this.sendChatMessage(message, channelUserId);
            } else if (response.status != 200) {
                let data = await response.json();
                console.error("Failed to send chat message");
                console.error(data);
            } 

            await sleep(2000);
        }
    }
}