import { UserRepository } from "./userRepository.js";
import { UserParser } from "./userParser.js";
import { event } from "../utils/events.js";

export class UserService {
    constructor(database) {
        this.userRepository = new UserRepository(database);
    }

    getUserRepository() {
        return this.userRepository;
    }

    startListening() {
        this.onUserAppear = (data) => {
            const { userId, userLogin, userName } = UserParser.parse(data);
            if (!this.userRepository.userExists(userId)) {
                this.userRepository.insertUser(userId, userLogin, userName);
            }
        };

        event.on("user_appeared", this.onUserAppear);
    }

    stopListening() {
        event.off("user_appeared", this.onUserAppear);
    }
}
