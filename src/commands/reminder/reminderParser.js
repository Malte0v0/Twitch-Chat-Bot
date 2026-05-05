import { convertToMs } from "../../utils/timeUtils.js";

export class ReminderParser {
    static parseDbData(reminderDb) {
        const reminderDict = {
            id: reminderDb.id,
            senderUserId: reminderDb.sender_user_id,
            targetUserId: reminderDb.target_user_id,
            message: reminderDb.message,
            createdAt: reminderDb.created_at,
            triggerTime: reminderDb.trigger_time,
            delivered: reminderDb.delivered,
        };
        return reminderDict;
    }

    static parseData(userId, userRepository, messageText) {
        const userLogin = userRepository.getUserLogin(userId);

        const currentTime = Date.now();

        const firstPattern = new RegExp(
            `^remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)$`,
        );
        const secondPattern = new RegExp(
            `^remind(?:me|\\s+(\\w+))\\s+(.+)in\\s+((?:\\d+\\s*\\w+\\s*)+)$`,
        );
        const thirdPatternNoMessage = new RegExp(
            `^remind(?:me|\\s+(\\w+))\\s+in\\s+((?:\\d+\\s*\\w+\\s*)+)\\s+(.+)$`,
        );
        const fourthPatternNoTime = new RegExp(
            `^remind(?:me|\\s+(\\w+))\\s+(.+)$`,
        );

        let match;
        let time = null;
        let message = null;

        if ((match = messageText.match(firstPattern))) {
            time = match[2];
            message = "";
        } else if ((match = messageText.match(secondPattern))) {
            time = match[3];
            message = match[2];
        } else if ((match = messageText.match(thirdPatternNoMessage))) {
            time = match[2];
            message = match[3];
        } else if ((match = messageText.match(fourthPatternNoTime))) {
            message = match[2];
        }

        if (!match) {
            return false;
        }

        if (!message) message = "";

        const targetUserName = match[1] || userLogin;
        const targetUserId = userRepository.getUserId(targetUserName);

        let triggerTime = null;
        if (time) {
            triggerTime = currentTime + convertToMs(time);
        }

        return {
            senderUserId: userId,
            targetUserId: targetUserId,
            message: message,
            triggerTime: triggerTime,
            createdAt: currentTime,
            time: time,
        };
    }
}
