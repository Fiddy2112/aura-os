import { type ScriptContext } from '../src/core/scripting/types.js';

export default async function(context: ScriptContext) {
  const { ui, executor } = context;
  const chalk = ui.chalk;

  ui.log(chalk.bold.blue('🐳 Whale Watcher Script Started'));

  const whaleAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik's address
  
  const spinner = ui.ora('Checking Vitalik\'s balance...').start();
  
  // We can use the executor to read public data without a private key
  const result = await executor.execute({
    action: 'CHECK_BALANCE',
    target_address: whaleAddress,
    token: 'ETH',
    amount: null,
    chain: null,
    reason: null,
    topic: null,
    includePrice: null
  });

  spinner.stop();

  if (result.success && result.data?.balance) {
      ui.log(chalk.green(`\nVitalik has: ${chalk.bold(result.data.balance)} ETH`));
      
      // Calculate USD value
      const priceRes = await executor.execute({
           action: 'GET_PRICE', 
           target_address: null, 
           token: 'ETH', 
           amount: null, 
           chain: null, 
           reason: null, 
           topic: null, 
           includePrice: null 
      });
      
      if (priceRes.success) {
          ui.log(`Current Price: ${priceRes.message}`);
      }
  } else {
      ui.log(chalk.red('Failed to fetch balance.'));
  }
}
