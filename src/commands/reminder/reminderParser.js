export class ReminderParser {
    parseUnsetData(userLogin, message) {
        const pattern = new RegExp(`^unset\\s+(\\d+)`);
        const match = message.match(pattern);

        if (match && match[1]) {
            return [userLogin, match[1]];
        } else {
            return;
        }
    }

    parseData(userLogin, message) {
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

        if ((match = message.match(firstPattern))) {
            time = match[2];
            message = "";
        } else if ((match = message.match(secondPattern))) {
            time = match[3];
            message = match[2];
        } else if ((match = message.match(thirdPatternNoMessage))) {
            time = match[2];
            message = match[3];
        } else if ((match = message.match(fourthPatternNoTime))) {
            message = match[2];
        }

        if (!match) {
            return false;
        }

        if (!message) message = "";

        const targetUser = match[1] || userLogin;

        let triggerTime = null;
        let timeToTarget = null;
        if (time) {
            timeToTarget = convertToMs(time);
            triggerTime = currentTime + timeToTarget;
        }

        return {
            userLogin: userLogin,
            target: targetUser,
            message: message,
            trigger_time: triggerTime,
            created_at: currentTime,
            time: time,
        };
    }
}
