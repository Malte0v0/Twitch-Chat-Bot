import type { CommandInput } from "./CommandInput.js";
import type { ChatPort } from "./ports/ChatPort.js";

export type PluginContext = {
  chat: ChatPort;
};

export type CommandHandler = (
  input: CommandInput,
  context: PluginContext,
) => Promise<void>;

export type CommandDefinition = {
  name: string;
  aliases?: string[];
  handler: CommandHandler;
};

export type CommandPlugin = {
  name: string;
  commands: CommandDefinition[];
};
