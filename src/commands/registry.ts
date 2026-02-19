import infoCommand from "./info.js";
import chainCommand from "./chain.js";
import privilegeCommand from "./privilege.js";

export const devCommands = {
  info: infoCommand,
  '-f': infoCommand,
  chain: chainCommand,
  privilege: privilegeCommand,
} satisfies Record<string, (args: string[]) => Promise<void> | void>;
