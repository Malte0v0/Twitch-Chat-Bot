import type { CommandInput } from "./CommandInput.js";
import { CommandKernel } from "./CommandKernel.js";
import type { CommandPlugin, PluginContext } from "./CommandPlugin.js";
import { strict as assert } from "node:assert";

const calls: string[] = [];

const commandKernel = new CommandKernel();

const plugin: CommandPlugin = {
  name: "test",
  commands: [
    {
      name: "testa",
      handler: async () => {
        calls.push("called");
      },
    },
  ],
};

commandKernel.register(plugin);

const input: CommandInput = {
  command: "testa",
  args: "",
  user: {
    id: 1,
    login: "tester",
    name: "Tester",
  },
  channel: {
    id: 1,
    name: "test",
  },
  receivedAt: new Date(),
};

const context: PluginContext = {
  chat: {
    async send() {},
    async replyTo() {},
  },
};

const handled = await commandKernel.dispatch(input, context);

assert.equal(handled, true);
assert.deepEqual(calls, ["called"]);

console.log("CommandKernel happy path passed");
