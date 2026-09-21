import type { CommandInput } from "./CommandInput.js";
import type {
  CommandDefinition,
  CommandPlugin,
  PluginContext,
} from "./CommandPlugin.js";

export class CommandKernel {
  private readonly commands = new Map<
    string,
    CommandDefinition["handler"]
  >();

  register(plugin: CommandPlugin): void {
    for (const command of plugin.commands) {
      this.registerCommand(command.name, command, plugin.name);

      for (const alias of command.aliases ?? []) {
        this.registerCommand(alias, command, plugin.name);
      }
    }
  }

  async dispatch(
    input: CommandInput,
    context: PluginContext,
  ): Promise<boolean> {
    const handler = this.commands.get(input.command.toLowerCase());

    if (!handler) {
      return false;
    }

    await handler(input, context);
    return true;
  }

  hasCommand(commandName: string): boolean {
    return this.commands.has(commandName.toLowerCase());
  }

  private registerCommand(
    name: string,
    command: CommandDefinition,
    pluginName: string,
  ): void {
    const normalizedName = name.toLowerCase();

    if (this.commands.has(normalizedName)) {
      throw new Error(
        `Command "${normalizedName}" from plugin "${pluginName}" is already registered`,
      );
    }

    this.commands.set(normalizedName, command.handler);
  }
}
