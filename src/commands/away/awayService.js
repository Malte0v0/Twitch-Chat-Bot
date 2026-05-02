import { event } from "../../utils/events.js";
import { msToHuman } from "../../utils/timeUtils.js";
import { AWAY_STATUS } from "../../utils/awayStatus.js";
import { AwayRepository } from "./awayRepository.js";

export class AwayService {
    constructor(chatService, database) {
        this.chatService = chatService;
        this.awayRepository = new AwayRepository(database);
    }

    start() {
        this.startListening();
    }

    _startListening() {
        event.on("user_appeared", this.handleAway.bind(this));
    }

    _stopListening() {
        event.off("user_appeared", this.handleAway.bind(this));
    }

    handleAway(userId, userLogin) {
        try {
            const status = this.awayRepository.checkChatterStatus(userId);

            if (status && status.awayState != 0) {
                const timeSince = msToHuman(Date.now() - status.time);

                switch (status.awayState) {
                    case AWAY_STATUS.afk:
                        this.awayRepository.toggleAwayStatus(userId);
                        this.chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer AFK${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    case AWAY_STATUS.asleep:
                        this.awayRepository.toggleAwayStatus(userId);
                        this.chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer sleeping${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    case AWAY_STATUS.showering:
                        this.awayRepository.toggleAwayStatus(userId);
                        this.chatService
                            .sendChatMessage(
                                `@${userLogin} is no longer showering${status.message} (${timeSince})`,
                            )
                            .catch((error) => {
                                console.log(
                                    "Error when trying to send chat message in statusService: ",
                                    error,
                                );
                            });
                        break;
                    default:
                        break;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async setAway(messageText, userId, userLogin, awayState = 1) {
        let status = this.awayRepository.checkChatterStatus(userId);
        if (!status) {
            this.awayRepository.insertChatterStatus(data);
            status = this.awayRepository.checkChatterStatus(userId);
        }

        switch (awayState) {
            case AWAY_STATUS.afk:
                this.awayRepository.toggleAwayStatus(
                    userId,
                    AWAY_STATUS.afk,
                    messageText,
                );
                await this.chatService.sendChatMessage(
                    `${userLogin} is now AFK${messageText}`,
                );
                break;
            case AWAY_STATUS.asleep:
                this.awayRepository.toggleAwayStatus(
                    userId,
                    AWAY_STATUS.asleep,
                    messageText,
                );
                await this.chatService.sendChatMessage(
                    `${userLogin} is now sleeping${messageText}`,
                );
                break;
            case AWAY_STATUS.showering:
                this.awayRepository.toggleAwayStatus(
                    userId,
                    AWAY_STATUS.showering,
                    messageText,
                );
                await this.chatService.sendChatMessage(
                    `${userLogin} is now showering xqcShower ${messageText}`,
                );
                break;
            default:
                break;
        }
    }
}
