import infoCommand from "./info.js";
import chainCommand from "./chain.js";
import privilegeCommand from "./privilege.js";
import riskCommand from "./risk.js";
import analyzeCommand from "./analyze.js";

type DevCommand = {
  handler: (args: string[])=> Promise<void> | void;
  description: string;
  aliases?: string[];
}

export const devCommands: Record<string, DevCommand> = {
  info:{
    handler: infoCommand,
    description: "Contract identity & intelligence",
    aliases: ["i"],
  },
  chain: {
    handler: chainCommand,
    description: "Manage blockchain chain",
    aliases: ["c"],
  },
  privilege: {
    handler: privilegeCommand,
    description: "Ownership & control surface analysis",
    aliases: ["p"],
  },
  risk: {
    handler: riskCommand,
    description: "Centralization & upgrade risk score",
    aliases: ["r"],
  },
  analyze: {
    handler: analyzeCommand,
    description: "Summary Verdict",
    aliases: ["a"],
  },
}