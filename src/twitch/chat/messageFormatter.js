import { FormattingError } from "../../errors/errors.js";
import { splitLength } from "../../utils/inputUtils.js";

export function formatMessage(message, lastSentMessage) {
    try {
        // Make sure you dont send the same string multple times in a row
        if (lastSentMessage === message) {
            message = message.endsWith(".")
                ? message.slice(0, -1)
                : message + ".";
        }

        const messages =
            message.length > 500 ? splitLength(message, 500) : [message];

        return messages;
    } catch (error) {
        throw new FormattingError(
            `Error when formatting message: ${error.message}`,
            error,
        );
    }
}
