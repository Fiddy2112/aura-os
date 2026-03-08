import { isAddress } from "viem";
import chalk from 'chalk';
import { getPublicClient } from "../core/blockchain/chains.js";
import ora from "ora";

function inferArg(raw:string):{type:string; value:unknown}{
    if(isAddress(raw)) return {type: 'address', value:raw};
    if(raw === 'true' || raw === "false") return {type: 'bool', value: raw === 'true'};
    if (/^0x[0-9a-fA-F]+$/.test(raw)) return { type: 'bytes32', value: raw as `0x${string}` };
    if (/^\d+$/.test(raw) && raw.length <= 9) return { type: 'uint32',  value: parseInt(raw) };
    if (/^\d+$/.test(raw)) return { type: 'uint256', value: BigInt(raw) };
    if (/^\d+n$/.test(raw)) return { type: 'uint256', value: BigInt(raw.slice(0, -1)) };
    return { type: 'string', value: raw };
}

function parseSig(sig:string):{name: string; inputs: {type:string}[] } | null{
    const match = sig.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/);
    if(!match) return null;
    const name = match[1];
    const params = match[2].trim() === '' ? [] : match[2].split(",").map(t => ({type: t.trim()}));
    
    return {name, inputs: params};
}

function formatResult(value:unknown,depth = 0): string{
    const indent = ' '.repeat(depth);
    if(value === null || value === undefined) return chalk.gray('null');
    if(typeof value === 'bigint') return chalk.yellow(value.toLocaleString('en-US'));
    if(typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false');
    if (typeof value === 'string')  return chalk.white(value);

    if(Array.isArray(value)){
        if(value.length === 0) return chalk.gray('[]');
        const items = value.map(v => `${indent} ${formatResult(v, depth + 1)}`).join('\n');
        return `[\n${items}\n${indent}]`;
    }
    if(typeof value === 'object'){
        const entries = Object.entries(value as object)
        .map(([k, v])=> `${indent} ${chalk.gray(k)}: ${formatResult(v, depth + 1)}`)
        .join('\n');

        return `{\n${entries}\n${indent}}`;
    }

    return String(value);
}

// commands

export async function callCommand(args:string[]):Promise<void>{
    // Usage: aura call <contract> <method|sig> [arg1 arg2 ...]
    if(args.length < 2 || args[0] === '--help'){
        console.log(chalk.bold.cyan('\n  aura call <contract> <method> [args...] [--json]\n'));
        console.log(chalk.gray('  Read-only smart contract call. No wallet needed.\n'));
        console.log(chalk.gray('  Method can be a name or full signature:'));
        console.log(chalk.gray('    aura call 0x1234... totalSupply'));
        console.log(chalk.gray('    aura call 0x1234... balanceOf 0xAbCd...'));
        console.log(chalk.gray('    aura call 0x1234... "balanceOf(address)" 0xAbCd...'));
        console.log(chalk.gray('    aura call 0x1234... ownerOf 1 --json\n'));
        return;
    }

    const contract = args[0] as `0x${string}`;
    const jsonMode = args.includes('--json');
    const cleanArgs = args.filter(a => a !== '--json');
    const methodRaw = cleanArgs[1];
    const rawCallArgs = cleanArgs.slice(2);

    if(!isAddress(contract)){
        console.error(chalk.red('\n Invalid contract address\n'));
        return;
    }

    const client = getPublicClient();

    // Verify contract
    const code = await client.getCode({address: contract});
    if(!code || code === '0x'){
        console.error(chalk.red('\n  Not a contract address\n'));
        return;
    }

    // Parse method
    let functionName: string;
    let inputTypes: {type:string}[];
    let callArgValues: unknown[];

    const parsed = parseSig(methodRaw);

    if(parsed){
        functionName = parsed.name;
        inputTypes = parsed.inputs;
        callArgValues = rawCallArgs.map((a, i) =>{
            const t = inputTypes[i]?.type ?? '';
            if(t.startsWith('uint') || t.startsWith('int')) return BigInt(a);
            if(t === 'bool') return a === 'true';
            if(t === 'address') return a;

            return a;
        })
    }else{
        functionName = methodRaw;
        const inferred = rawCallArgs.map(inferArg);
        inputTypes = inferred.map(i => ({type: i.type}));
        callArgValues = inferred.map(i => i.value);
    }

    const abi = [
        {
            name: functionName,
            type: 'function' as const,
            stateMutability: 'view' as const,
            inputs: inputTypes,
            outputs: [{type: 'bytes32'}],
        }
    ];

    const spinner = ora(chalk.cyan(` Calling ${functionName}...`)).start();

    try{
        const result = await client.readContract({
            address: contract,
            abi: abi as any,
            functionName,
            args: callArgValues.length > 0 ? callArgValues : undefined,
        });

        spinner.stop();

        if(jsonMode){
            const serialized = JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
            console.log(serialized);
            return;
        }

        console.log(chalk.bold.cyan(`\n  ${contract.slice(0, 10)}...  ${chalk.white('→')}  ${chalk.cyan(functionName)}(${rawCallArgs.join(', ')})\n`));
        console.log(`  ${chalk.gray('Result:')} ${formatResult(result)}`);
        console.log('');
    }catch(error){
        spinner.stop();
        const msg = error instanceof Error ? error.message : String(error);

        // Common errors with helpful hints
        if (msg.includes('does not exist') || msg.includes('selector not found')) {
        console.error(chalk.red(`\n  Function "${functionName}" not found on this contract.`));
        console.error(chalk.gray(`  Tip: Use "aura abi ${contract}" to see available functions.\n`));
        } else if (msg.includes('revert')) {
        console.error(chalk.red(`\n  Call reverted: ${msg.slice(0, 120)}\n`));
        } else {
        console.error(chalk.red(`\n  Error: ${msg.slice(0, 200)}\n`));
        }
    }

}