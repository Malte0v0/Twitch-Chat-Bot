import { AuthService } from "./src/services/authService.js"
import { ChatService } from "./src/services/chatService.js";
import { EarthquakeService } from "./src/services/earthquakeService.js";
import { TwitchService } from "./src/services/twitchService.js";
import { NitterService } from "./src/services/nitterService.js";
import { Commands } from "./src/core/commands.js";
import { Scheduler } from "./src/core/scheduler.js"
import { ChatDatabase } from "./src/core/chatDatabase.js";
import "dotenv/config";

const commandPrefix = "$"
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function main() {
    const db = new ChatDatabase();
    const scheduler = new Scheduler();
	const authService = new AuthService(process.env.OAUTH_TOKEN, process.env.REFRESH_TOKEN);
	const chatService = new ChatService(authService);
	const commands = new Commands(chatService, db, scheduler, commandPrefix);

	const earthquakeService = new EarthquakeService(chatService, db);
	const nitterService = new NitterService(chatService);
	
    const twitchService = new TwitchService(authService, chatService, nitterService, commands, commandPrefix);

	setInterval(() => {
		authService.refreshOAuthToken().catch(console.error);
	}, REFRESH_INTERVAL_MS);


}

main().catch(console.error);