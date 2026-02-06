import { BlockchainExecutor } from '../blockchain/executor.js';
import { AIInterpreter } from '../ai/interpreter.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

export interface ScriptContext {
  executor: BlockchainExecutor;
  ai: AIInterpreter;
  ui: {
    inquirer: typeof inquirer;
    chalk: typeof chalk;
    ora: typeof ora;
    log: (msg: string) => void;
  };
  args: string[];
  utils:{
    unlockWallet:()=> Promise<BlockchainExecutor | null>;
  }
}

export type AuraScript = (context: ScriptContext) => Promise<void>;
