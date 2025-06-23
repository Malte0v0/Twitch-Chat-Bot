import Database from "better-sqlite3";
import "dotenv/config";

import { initializeDatabase } from "./src/database/index.js";
import { AuthService } from "./src/services/authService.js"
import { WebSocketService } from "./src/services/websocketService.js";
import { ChatService } from "./src/services/chatService.js";
import { EarthquakeService } from "./src/services/earthquakeService.js";
import { Commands } from "./src/commands/index.js";


const db = new Database("database.db", {timeout: 1000});

const commandPrefix = "$"

const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function main() {
	initializeDatabase(db);

	const authService = new AuthService(process.env.OAUTH_TOKEN, process.env.REFRESH_TOKEN);
	await authService.getAuth();
	const chatService = new ChatService(authService);
	const earthquakeService = new EarthquakeService(chatService);
	const commands = new Commands(chatService, db);
	const websocketService = new WebSocketService(authService, chatService, commands, commandPrefix);

	setInterval(() => {
		authService.refreshOAuthToken().catch(console.error);
	}, REFRESH_INTERVAL_MS);


}

main().catch(console.error);