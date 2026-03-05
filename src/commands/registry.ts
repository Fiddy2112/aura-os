import infoCommand from "./info.js";
import chainCommand from "./chain.js";
import privilegeCommand from "./privilege.js";
import riskCommand from "./risk.js";
import analyzeCommand from "./analyze.js";
import { scriptCommand } from "./script.js";
import { runCommand } from "./run.js";
import txCommand from "./tx.js";
import { gasCommand } from "./gas.js";

type DevCommand = {
  handler: (args: string[]) => Promise<void> | void;
  description: string;
  aliases?: string[];
};

export const devCommands: Record<string, DevCommand> = {
  info: {
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
    description: "Full contract summary verdict",
    aliases: ["a"],
  },
  script: {
    handler: scriptCommand,
    description: "Manage custom scripts (list, create)",
    aliases: ["s"],
  },
  run: {
    handler: runCommand,
    description: "Run a custom script from ./scripts folder",
    // no alias — 'r' is taken by risk
  },
  tx: {
    handler: txCommand,
    description: "Transaction analysis by hash",
    aliases: ["t"],
  },
  gas: {
    handler: gasCommand,
    description: "Real-time gas prices across networks",
    aliases: ["g"],
  },
};