import infoCommand from "./info.js";
import chainCommand from "./chain.js";
import privilegeCommand from "./privilege.js";
import riskCommand from "./risk.js";
import analyzeCommand from "./analyze.js";
import { scriptCommand } from "./script.js";
import { runCommand } from "./run.js";
import txCommand from "./tx.js";
import { gasCommand } from "./gas.js";
import { approveCommand } from "./approve.js";
import { convertCommand } from "./convert.js";
import { honeypotCommand } from "./honeypot.js";
import { abiCommand } from "./abi.js";

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
  approve: {
    handler: approveCommand,
    description: "Scan and revoke token approvals",
    aliases: ["ap"],
  },
  convert: {
    handler: convertCommand,
    description: "Convert tokens",
    aliases: ["cv"],
  },
  honeypot: {
    handler: honeypotCommand,
    description: "Scan for honeypot tokens",
    aliases: ["hp"],
  },
  abi: {
    handler: abiCommand,
    description: "Get contract ABI",
    aliases: ["ab"],
  },
};