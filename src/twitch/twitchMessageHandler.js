import { EventEmitter } from "events";
import { event } from "../utils/events.js";
import { sanitizeInput } from "../utils/inputUtils.js";
import { getHumanTimeFromDate } from "../utils/timeUtils.js";

export class TwitchMessageHandler extends EventEmitter {
    constructor(commandPrefix, commandRegex) {
        super();
        this.commandPrefix = commandPrefix;
        this.commandRegex = commandRegex;
    }

    handleMessage(data) {
        const time = new Date(data.metadata.message_timestamp);
        const messageTime = getHumanTimeFromDate(time);

        console.log(
            `MSG ${messageTime} #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`,
        );

        let messageText = sanitizeInput(data.payload.event.message.text).trim();

        event.emit("user_appeared", data);

        try {
            if (messageText.toLowerCase().startsWith(this.commandPrefix)) {
                const match = messageText
                    .toLowerCase()
                    .match(this.commandRegex);
                if (match && match[1]) {
                    const command = match[1];
                    messageText = match[2] ? match[2].trim() : "";
                    this.emit("command", command, messageText, data);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
}
