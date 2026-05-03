import { EventEmitter } from "events";

export class TwitchMessageHandler extends EventEmitter {
    constructor(commandPrefix, commandRegex) {
        super();
        this.commandPrefix = commandPrefix;
        this.commandRegex = commandRegex;
    }

    handleMessage(data) {
        console.log(
            `MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`,
        );

        const messageText = sanitizeInput(
            data.payload.event.message.text,
        ).trim();

        event.emit("user_appeared", data);

        try {
            if (messageText.toLowerCase().startsWith(this.commandPrefix)) {
                const match = message.toLowerCase().match(this.commandRegex);
                if (match && match[1]) {
                    const command = match[1];
                    messageText = match[2] ? match[2].trim() : messageText;
                    this.emit("command", (command, messageText, data));
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
}
