import { ChatDatabase } from "./src/chatDatabase.js";
import { Scheduler } from "./src/scheduler.js";
import { AuthService } from "./src/twitch/auth/authService.js";
import { TwitchService } from "./src/twitch/twitchService.js";
import { ChatService } from "./src/twitch/chat/chatService.js";
import { CommandController } from "./src/commandController.js";
import { EarthquakeService } from "./src/earthquake/earthquakeService.js";
// import { UserService } from "./src/user/userService.js";
// import { AwayService } from "./src/commands/away/awayService.js";
// import { ReminderService } from "./src/commands/reminder/reminderService.js";
import "dotenv/config";

const commandPrefix = "$";
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function main() {
    const database = new ChatDatabase("database.db");
    database.initialize();
    const scheduler = new Scheduler();

    const authService = new AuthService();
    authService.getAuth();
    const chatService = new ChatService(authService);

    // const awayService = new AwayService(chatService, database);
    // awayService.start();

    // const reminderService = new ReminderService(
    //     chatService,
    //     userRepository,
    //     database,
    //     scheduler,
    // );
    // reminderService.startListening();

    const commandController = new CommandController(
        chatService,
        database,
        scheduler,
    );
    const twitchService = new TwitchService(commandPrefix, commandController);
    twitchService.start();

    const earthquakeService = new EarthquakeService(chatService, database);
    earthquakeService.start();

    setInterval(() => {
        authService.refreshOAuthToken().catch(console.error);
    }, REFRESH_INTERVAL_MS);
}

main().catch(console.error);
