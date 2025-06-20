import Database from "better-sqlite3";
import "dotenv/config";

import { initializeDatabase } from "./src/database/index.js";
import { AuthService } from "./src/services/authService.js"
import { WebSocketService } from "./src/services/websocketService.js";
import { ChatService } from "./src/services/chatService.js";
import { ReminderScheduler } from "./src/schedulers/reminderScheduler.js";
import { WeatherService } from "./src/services/weatherService.js";
import { StatusService } from "./src/services/statusService.js";

const db = new Database("database.db", {timeout: 1000});

const commandPrefix = "$"

const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function main() {
	initializeDatabase(db);

	const authService = new AuthService(process.env.OAUTH_TOKEN, process.env.REFRESH_TOKEN);
	await authService.getAuth();
	const chatService = new ChatService(authService);
	const reminderScheduler = new ReminderScheduler(chatService, db, commandPrefix);
	const statusService = new StatusService(chatService, db, commandPrefix);
	const weatherService = new WeatherService(commandPrefix, chatService);
	const websocketService = new WebSocketService(authService, chatService, statusService, reminderScheduler, weatherService, commandPrefix);

	reminderScheduler.start();
	
	setInterval(() => {
		authService.refreshOAuthToken().catch(console.error);
	}, REFRESH_INTERVAL_MS);


}

main().catch(console.error);



// // Start executing the bot from here
// (async () => {
// 	// Verify that the authentication is valid
// 	await getAuth();

// 	const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
// 	setInterval(() => {
// 		refreshOAuthToken().catch(console.error);
// 	}, REFRESH_INTERVAL_MS);

//     initializeDatabase();
//     startReminderScheduler();

// 	// Start WebSocket client and register handlers
// 	websocketClient = startWebSocketClient();
// })();