import "dotenv/config";
import { ChatDatabase } from "./src/chatDatabase.js";
import { Scheduler } from "./src/scheduler.js";
import { AuthService } from "./src/twitch/auth/authService.js";
import { TwitchService } from "./src/twitch/twitchService.js";
import { ChatService } from "./src/twitch/chat/chatService.js";
import { CommandController } from "./src/commandController.js";
import { EarthquakeService } from "./src/earthquake/earthquakeService.js";
import { TwitchMessageHandler } from "./src/twitch/twitchMessageHandler.js";
import { CommandKernel } from "./src/core/CommandKernel.js";
import { GoogleNewsAdapter } from "./src/commands/news/adapters/GoogleNewsAdapter.js";
import { NewsService } from "./src/commands/news/NewsService.js";
import { createNewsPlugin } from "./src/commands/news/NewsPlugin.js";
import { TwitchChatAdapter } from "./src/twitch/adapters/TwitchChatAdapter.js";
import { TimeService } from "./src/commands/time/TimeService.js";
import { createTimePlugin } from "./src/commands/time/TimePlugin.js";
import { QuoteService } from "./src/commands/quote/QuoteService.js";
import { ZenQuotesAdapter } from "./src/commands/quote/adapters/ZenQuotesAdapter.js";
import { createQuotePlugin } from "./src/commands/quote/QuotePlugin.js";
import { OpenWeatherMapAdapter } from "./src/commands/weather/adapters/OpenWeatherMapAdapter.js";
import { WeatherService } from "./src/commands/weather/WeatherService.js";
import { createWeatherPlugin } from "./src/commands/weather/WeatherPlugin.js";
import { LocationService } from "./src/commands/location/LocationService.js";
import { createLocationPlugin } from "./src/commands/location/LocationPlugin.js";
import { LocationRepository } from "./src/core/adapters/LocationRepository.js";
import { MovieService } from "./src/commands/movie/MovieService.js";
import { CachedMovieAdapter } from "./src/commands/movie/adapters/CachedMovieAdapter.js";
import { MovieRepository } from "./src/commands/movie/adapters/MovieRepository.js";
import { OmdbMovieAdapter } from "./src/commands/movie/adapters/OmdbMovieAdapter.js";
import { NominationRepository } from "./src/commands/movie/adapters/NominationRepository.js";
import { createMoviePlugin } from "./src/commands/movie/MoviePlugin.js";
import { TwelveDataAdapter } from "./src/commands/stock/adapters/TwelveDataAdapter.js";
import { StockService } from "./src/commands/stock/StockService.js";
import { createStockPlugin } from "./src/commands/stock/StockPlugin.js";
import { YahooFinanceAdapter } from "./src/commands/stock/adapters/YahooFinanceAdapter.js";

const commandPrefix = "$";
const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;

async function main() {
  const database = new ChatDatabase("database.db");
  database.initialize();
  const scheduler = new Scheduler();

  const authService = new AuthService();

  const chatService = new ChatService(authService);

  const chat = new TwitchChatAdapter(chatService);
  const commandKernel = new CommandKernel();

  // NEWS
  const newsAdapter = new GoogleNewsAdapter();
  const newsService = new NewsService(newsAdapter);
  const newsPlugin = createNewsPlugin(newsService);

  // TIME
  const timeService = new TimeService();
  const timePlugin = createTimePlugin(timeService);

  // QUOTES
  const zenQuotesAdapter = new ZenQuotesAdapter(
    "https://zenquotes.io/api/quotes",
  );
  const quoteService = new QuoteService(zenQuotesAdapter);
  const quotePlugin = createQuotePlugin(quoteService);

  // WEATHER & LOCATION
  const locationRepository = new LocationRepository(database);

  const openWeatherMapAdapter = new OpenWeatherMapAdapter(
    process.env.WEATHER_API,
  );
  const weatherService = new WeatherService(
    locationRepository,
    openWeatherMapAdapter,
  );
  const weatherPlugin = createWeatherPlugin(weatherService);

  const locationService = new LocationService(locationRepository);
  const locationPlugin = createLocationPlugin(locationService);

  // STOCKS
  const twelveDataAdapter = new TwelveDataAdapter(process.env.STOCK_API);
  const yahooFinanceAdapter = new YahooFinanceAdapter();
  const stockService = new StockService(yahooFinanceAdapter);
  const stockPlugin = createStockPlugin(stockService);

  // MOVIE
  const cachedMovieAdapter = new CachedMovieAdapter(
    new OmdbMovieAdapter(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_API}&i=`,
    ),
    new MovieRepository(database),
  );
  cachedMovieAdapter.loadToCacheFromRepository();
  const movieService = new MovieService(
    cachedMovieAdapter,
    new NominationRepository(database),
  );
  const moviePlugin = createMoviePlugin(movieService);

  const now = new Date();
  const target = new Date();
  target.setUTCHours(19, 0, 0, 0);

  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);

  const msUntil8pmUTC = target.getTime() - now.getTime();

  async function sendWeeklyNominationMessages() {
    for (const msg of movieService.getWeeklyNominationsMessage()) {
      await chat.send(msg);
    }
  }

  setTimeout(() => {
    sendWeeklyNominationMessages();
    setInterval(() => {
      sendWeeklyNominationMessages();
    }, TWELVE_HOURS_IN_MS);
  }, msUntil8pmUTC);

  // REGISTER PLUGINS TO KERNEL
  commandKernel.register(newsPlugin);
  commandKernel.register(timePlugin);
  commandKernel.register(quotePlugin);
  commandKernel.register(weatherPlugin);
  commandKernel.register(locationPlugin);
  commandKernel.register(moviePlugin);
  commandKernel.register(stockPlugin);

  // LEGACY COMMANDS
  const commandController = new CommandController(
    chatService,
    database,
    scheduler,
  );

  const messageHandler = new TwitchMessageHandler(
    commandPrefix,
    (command, args, data) => {
      const event = data.payload.event;

      const input = {
        command,
        args,
        user: {
          id: event.chatter_user_id,
          login: event.chatter_user_login,
          name: event.chatter_user_name,
        },
        channel: {
          id: event.broadcaster_user_id,
          name: event.broadcaster_user_login,
        },
        receivedAt: new Date(data.metadata.message_timestamp),
      };

      commandKernel
        .dispatch(input, { chat })
        .then((handled) => {
          if (!handled) {
            return commandController.handleCommand(command, args, data);
          }
        })
        .catch((error) => {
          console.error("Command dispatch failed:", error);
        });
    },
  );
  const twitchService = new TwitchService(authService, {
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
