import chalk from 'chalk';
import { createPublicClient, http, formatUnits } from 'viem';
import { SUPPORTED_CHAINS } from '../core/blockchain/chains.js';
import ora from 'ora';
import { syncActivity } from '../core/utils/supabase.js';

export async function gasCommand() {
  console.log(chalk.bold.cyan('\n Real-time Gas Dashboard\n'));
  const spinner = ora('Fetching gas prices from multiple networks...').start();

  try {
    const gasPromises = Object.entries(SUPPORTED_CHAINS).map(async ([key, config]) => {
      try {
        const client = createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrls[0]), // Use primary RPC
        });

        const gasPrice = await client.getGasPrice();
        return {
          network: config.name,
          price: formatUnits(gasPrice, 9),
          symbol: config.nativeCurrency.symbol,
          success: true
        };
      } catch (err) {
        return {
          network: config.name,
          success: false
        };
      }
    });

    const results = await Promise.all(gasPromises);
    spinner.stop();

    // Sync to dashboard
    const validResults = results.filter(r => r.success);
    const syncData = validResults.map(r => `${r.network}: ${r.price} Gwei`).join('\n');
    await syncActivity
    ("GAS", { networks: validResults.length }, syncData);

    console.log(chalk.gray(' Network'.padEnd(25) + ' Gas Price (Gwei)'.padEnd(20)));
    console.log(chalk.gray(' ──────────────────────────────────────────────────'));

    results.forEach(res => {
      if (res.success) {
        let color = chalk.green;
        const priceNum = parseFloat(res.price || '0');
        const priceStr = priceNum < 1 ? priceNum.toFixed(4) : priceNum.toFixed(2);
        
        if (priceNum > 50) color = chalk.red;
        else if (priceNum > 20) color = chalk.yellow;

        console.log(
          chalk.white(` ${res.network.padEnd(23)} `) + 
          color(`${priceStr.padStart(8)} Gwei`)
        );
      } else {
        console.log(chalk.white(` ${res.network.padEnd(23)} `) + chalk.red(' Offline'));
      }
    });

    console.log(chalk.gray('\n 💡 Prices updated via direct RPC query.\n'));

  } catch (error) {
    spinner.fail('Failed to fetch gas prices.');
    console.error(error);
  }
}
