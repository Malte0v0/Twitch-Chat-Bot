import { event } from "../../utils/events.js";
import { msToHuman } from "../../utils/timeUtils.js";
import { AWAY_STATUS } from "./awayStatus.js";
import { AwayRepository } from "./awayRepository.js";

const AWAY_STATES = {
    [AWAY_STATUS.afk]: "AFK",
    [AWAY_STATUS.asleep]: "sleeping",
    [AWAY_STATUS.showering]: "showering",
};

export class AwayService {
    constructor(chatService, database) {
        this.chatService = chatService;
        this.awayRepository = new AwayRepository(database);
    }

    start() {
        this._startListening();
    }

    stop() {
        this._stopListening();
    }

    _startListening() {
        this.onUserAppear = (data) => {
            this.handleReturn(
                data.payload.event.chatter_user_id,
                data.payload.event.chatter_user_name,
            );
        };

        event.on("user_appeared", this.onUserAppear.bind(this));
    }

    _stopListening() {
        event.off("user_appeared", this.onUserAppear);
    }

    handleReturn(userId, userName) {
        try {
            const status = this.awayRepository.getUserStatus(userId);

            if (status && status.awayState != 0) {
                const awayState = status.awayState;
                const timeSince = msToHuman(Date.now() - status.time);

                const label = AWAY_STATES[awayState];

                if (label) {
                    this.awayRepository.toggleAway(userId, awayState);

                    if (status.message) {
                        status.message = ": " + status.message;
                    }

                    this.chatService
                        .sendChatMessage(
                            `@${userName} is no longer ${label}${status.message} (${timeSince})`,
                        )
                        .catch((error) => {
                            console.log(
                                "Error when trying to send chat message in statusService: ",
                                error,
                            );
                        });
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async setAway(messageText, userId, userLogin, awayState = 1) {
        let status = this.awayRepository.getUserStatus(userId);
        if (!status) {
            this.awayRepository.insertNewUser(userId);
            status = this.awayRepository.getUserStatus(userId);
        }

        const label = AWAY_STATES[awayState];

        if (label) {
            this.awayRepository.toggleAway(userId, awayState, messageText);

            if (messageText) {
                messageText = ": " + messageText;
            }

            await this.chatService.sendChatMessage(
                `@${userLogin} is now ${label}${messageText}`,
            );
        }
    }
}
