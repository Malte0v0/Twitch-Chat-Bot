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

            const user = this.userRepository.getUserById(userId);

            if (!user) {
                this.userRepository.insertUser(userId, userLogin, userName);
            } else if (
                user.user_login !== userLogin ||
                user.user_name !== userName
            ) {
                this.userRepository.updateUser(userId, userLogin, userName);
            }
        };

        event.on("user_appeared", this.onUserAppear);
    }

    stopListening() {
        event.off("user_appeared", this.onUserAppear);
    }
}
