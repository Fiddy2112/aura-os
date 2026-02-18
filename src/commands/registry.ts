import infoCommand from "./info.js";
import chainCommand from "./chain.js";

export const devCommands = {
  info: infoCommand,
  '-f': infoCommand,
  chain: chainCommand,
} satisfies Record<string, (args: string[]) => Promise<void> | void>;