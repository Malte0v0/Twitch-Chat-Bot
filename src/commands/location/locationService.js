import { LocationRepository } from "./locationRepository.js";

export class LocationService {
    constructor(chatService, database) {
        this.chatService = chatService;
        this.locationRepository = new LocationRepository(database);
    }

    async locationCommand(messageText, userId, userLogin) {
        const result = this.locationRepository.insertLocation(
            userId,
            messageText,
        );

        if (result.lastInsertRowid) {
            await this.chatService.sendChatMessage(
                `@${userLogin}, your default location has been set to ${messageText}`,
            );
        }
    }
}
