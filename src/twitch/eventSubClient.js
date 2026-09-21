import { EventSubError } from "../errors/errors.js";
import { logTime } from "../errors/log.js";

export class EventSubClient {
  constructor(authService) {
    this.authService = authService;
    this.botUserId = process.env.BOT_USER_ID;
    this.chatUserId = process.env.CHAT_USER_ID;
  }

  async registerEventSubListeners(sessionId, attempts = 0) {
    let response;
    try {
      logTime(`(${sessionId}) Registering Twitch eventsub`);
      response = await fetch(
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
      throw new EventSubError("Error when registering Twitch eventsub", error);
    }

    const data = await response.json();

    if (response.status === 401 && attempts < 1) {
      await this.authService.refreshOAuthToken();
      return await this.registerEventSubListeners(sessionId, attempts + 1);
    }

    if (response.status !== 202) {
      throw new EventSubError(
        `${sessionId} Registering Twitch eventsub failed with status ${response.status}: ${JSON.stringify(data)}`,
      );
    }
  }
}
