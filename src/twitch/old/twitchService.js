import WebSocket from "ws";
import { getHumanTimeFromDate } from "../../utils/timeUtils.js";
import { sanitizeInput } from "../../utils/inputUtils.js";
import { event } from "../../utils/events.js";

export class TwitchService {
    constructor(
        commands,
        commandPrefix,
    ) {

        this.commands = commands;

        this.commandPrefix = commandPrefix;
        this.commandRegex = new RegExp(`^(?:\\${this.commandPrefix})(\\w+)`);

        this.twitchClient = new TwitchClient();
        this.twitchClient.connect();

        this.twitchClient.on("message", (data) => {
            this.handleMessage(data);
        })
    }

    handleMessage(data) {
        console.log(
            `MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`,
        );

        const messageTest = sanitizeInput(
            data.payload.event.message.text,
        ).trim();

        const senderLogin = data.payload.event.chatter_user_login;

        event.emit("user_appeared", data);

        try {
            if (
                messageText
                    .toLowerCase()
                    .startsWith(this.commandPrefix)
            ) {
                const match = messageText
                    .toLowerCase()
                    .match(this.commandRegex);
                if (match && match[1]) {
                    const command = match[1];
                    await this.commands.handleCommand(
                        command,
                        messageText,
                        data,
                    );
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

}
