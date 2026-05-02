import Database from "better-sqlite3";
import { LocationRepository } from "./locationRepository";

export class LocationService {
    constructor(chatService, database) {
        this.chatService = chatService;
        this.locationRepository = new LocationRepository(Database);
    }

    async locationCommand(messageText, userLogin) {
        const result = this.locationRepository.insertLocation(messageText);

        if (result.lastInsertRowid) {
            await this.chatService.sendChatMessage(
                `@${userLogin}, your default location has been set to ${messageText}`,
            );
        }
    }
}
