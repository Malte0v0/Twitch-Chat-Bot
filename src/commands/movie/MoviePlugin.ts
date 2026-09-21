import type {
  CommandHandler,
  CommandPlugin,
} from "../../core/CommandPlugin.js";
import type { MovieService } from "./MovieService.js";
import { getOmdbIdFromUrl } from "./MovieParser.js";

export function createMoviePlugin(movieService: MovieService): CommandPlugin {
  const handleMovies: CommandHandler = async (_input, context) => {
    const messages = movieService.getWeeklyNominationsMessage();
    for (const message of messages) {
      await context.chat.send(message);
    }
  };

  const handleNominate: CommandHandler = async (input, context) => {
    const message = await movieService.nominateMovie(
      input.user.id,
      getOmdbIdFromUrl(input.args),
    );
    await context.chat.replyTo(input.user.name, message);
  };

  const handleUnsetNomination: CommandHandler = async (input, context) => {
    const message = movieService.removeMovieNomination(input.user.id);
    await context.chat.replyTo(input.user.name, message);
  };

  return {
    name: "movies",
    commands: [
      {
        name: "movies",
        aliases: ["nominations"],
        handler: handleMovies,
      },
      {
        name: "nominate",
        aliases: ["setMovie"],
        handler: handleNominate,
      },
      {
        name: "unsetMovie",
        aliases: ["unnominate", "unsetnomination"],
        handler: handleUnsetNomination,
      },
    ],
  };
}
