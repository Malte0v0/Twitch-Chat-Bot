import { ChatDatabase } from "./src/chatDatabase.js";
import { Scheduler } from "./src/scheduler.js";
import { AuthService } from "./src/twitch/auth/authService.js";
import { TwitchService } from "./src/twitch/twitchService.js";
import { ChatService } from "./src/twitch/chat/chatService.js";
import { CommandController } from "./src/commandController.js";
import { EarthquakeService } from "./src/earthquake/earthquakeService.js";
import "dotenv/config";
import { TwitchMessageHandler } from "./src/twitch/twitchMessageHandler.js";

const commandPrefix = "$";
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function main() {
  const database = new ChatDatabase("database.db");
  database.initialize();
  const scheduler = new Scheduler();

  const authService = new AuthService();
  await authService.validateToken();

  const chatService = new ChatService(authService);

  const commandController = new CommandController(
    chatService,
    database,
    scheduler,
  );
  const messageHandler = new TwitchMessageHandler(commandPrefix, (command, args, data) => {
    commandController.handleCommand(command, args, data);
  });
  const twitchService = new TwitchService({
    onNotification: (data) => messageHandler.handle(data),
  });
  twitchService.start();

  const earthquakeService = new EarthquakeService(chatService, database);
  earthquakeService.start();

  setInterval(() => {
    authService.refreshOAuthToken().catch(console.error);
  }, REFRESH_INTERVAL_MS);
}

main().catch((error) => console.error(error));
