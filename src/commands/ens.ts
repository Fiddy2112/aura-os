import chalk from "chalk";
import { getPublicClient } from "../core/blockchain/chains.js";
import ora from "ora";
import { getAddress, isAddress } from "viem";
import { normalize } from "viem/ens";

export async function ensCommand(args: string[]):Promise<void>{
    const input = args[0];
    const jsonMode = args.includes("--json");
    
    if(!input || input === "--help"){
        console.log(chalk.bold.cyan("\n aura ens <name.eth | 0x...> [--json]\n"));
        console.log(chalk.gray('  Resolve ENS name → address, or address → ENS name.\n'));
        console.log(chalk.gray('  Examples:'));
        console.log(chalk.gray('    aura ens vitalik.eth'));
        console.log(chalk.gray('    aura ens 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n'));
        return;
    }

    const client = getPublicClient();
    const spinner = ora(chalk.cyan(" Querying ENS...")).start();
    
    try{
        // Reverse
        if(isAddress(input)){
            const address = getAddress(input);

            const [ensName, avatar] = await Promise.all([
                client.getEnsName({address}),
                client.getEnsAvatar({ name: input }),
            ])

            spinner.stop();

            const name = ensName ?? "(no ENS name)";
            const avatarURL = avatar ?? "(no avatar)";

            if (jsonMode) {
                console.log(JSON.stringify({ address, ensName: name, avatar: avatarURL }, null, 2));
                return;
            }

            console.log(chalk.bold.cyan('\n  ENS Reverse Lookup'));
            console.log(chalk.gray('  ' + '─'.repeat(44)));
            console.log(`  ${chalk.gray('Address:')} ${chalk.white(address)}`);
            console.log(`  ${chalk.gray('ENS:    ')} ${name ? chalk.green(name) : chalk.gray('No primary ENS name set')}`);
            if (avatarURL) console.log(`  ${chalk.gray('Avatar: ')} ${chalk.cyan(avatarURL)}`);
            console.log('');
            return;
        }

        // Forward
        const name = input.endsWith(".eth") ? input : `${input}.eth`;

        let normalized : string;
        try{
            normalized = normalize(name);
        }catch{
            spinner.stop();
            console.error(chalk.red(`\n  Invalid ENS name: "${name}"\n`));
            return;
        }

        const [addrResult, avatarResult, twitterResult, emailResult, urlResult] = await Promise.allSettled([
            client.getEnsAddress({name: normalized}),
            client.getEnsAvatar({name: normalized}),
            client.getEnsText({name: normalized, key: 'com.twitter'}),
            client.getEnsText({name: normalized, key: 'email'}),
            client.getEnsText({name: normalized, key: 'url'})
        ]);

        spinner.stop();

        const address = addrResult.status === "fulfilled" ? addrResult.value : null;

        if(!address){
            console.log(chalk.red(`\n  No address found for "${normalized}". Name may not be registered.\n`));
            return;
        }

        const avatarUrl = avatarResult.status  === 'fulfilled' ? avatarResult.value  : null;
        const twitter   = twitterResult.status === 'fulfilled' ? twitterResult.value : null;
        const email     = emailResult.status   === 'fulfilled' ? emailResult.value   : null;
        const url       = urlResult.status     === 'fulfilled' ? urlResult.value     : null;

        if (jsonMode) {
            console.log(JSON.stringify({ name: normalized, address, avatar: avatarUrl, twitter, email, url }, null, 2));
            return;
        }

        console.log(chalk.bold.cyan('\n  ENS Lookup'));
        console.log(chalk.gray('  ' + '─'.repeat(44)));
        console.log(`  ${chalk.gray('Name:   ')} ${chalk.green(normalized)}`);
        console.log(`  ${chalk.gray('Address:')} ${chalk.white(address)}`);
        if (avatarUrl) console.log(`  ${chalk.gray('Avatar: ')} ${chalk.cyan(avatarUrl)}`);
        if (twitter)   console.log(`  ${chalk.gray('Twitter:')} ${chalk.cyan(`@${twitter}`)}`);
        if (email)     console.log(`  ${chalk.gray('Email:  ')} ${chalk.white(email)}`);
        if (url)       console.log(`  ${chalk.gray('URL:    ')} ${chalk.cyan(url)}`);
        console.log('');
    }catch(error){
        spinner.stop();
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('chain') || msg.includes('mainnet')) {
        console.error(chalk.red('\n  ENS requires Ethereum mainnet. Switch with: aura chain set mainnet\n'));
        } else {
        console.error(chalk.red(`\n  Error: ${msg}\n`));
        }
    }
}