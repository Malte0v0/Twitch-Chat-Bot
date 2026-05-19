import { event } from "../utils/events.js";
import { sanitizeInput } from "../utils/inputUtils.js";
import { logTime } from "../errors/log.js";

export class TwitchMessageHandler {
    #prefix;
    #commandRegex;
    #onCommand;

    constructor(commandPrefix, onCommand) {
        this.#prefix      = commandPrefix.toLowerCase();
        this.#commandRegex = new RegExp(`^\\${commandPrefix}(\\w+)(?:\\s+(.*))?`, "i");
        this.#onCommand   = onCommand;
    }

    handle(data) {
        const { broadcaster_user_login, chatter_user_login, message } =
            data.payload.event;

        const raw  = sanitizeInput(message.text).trim();
        const time = new Date(data.metadata.message_timestamp);

        console.log(
          `MSG ${time} #${broadcaster_user_login} <${chatter_user_login}> ${raw}`,
        );

        event.emit("user_appeared", data);

        if (raw.toLowerCase().startsWith(this.#prefix)) {
            const match = raw.match(this.#commandRegex);
            if (match) {
                const command = match[1].toLowerCase();
                const args    = match[2]?.trim() ?? "";
                try {
                    this.#onCommand(command, args, data);
                } catch (error) {
                    logTime(`Command handler threw for "$${command}", ${error}`, 3);
                }
            }
        }
    }
}