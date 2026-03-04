/**
 * Aura OS Custom Script
 * Built with ❤️ for the Web3 community
 */
export default async function(context) {
  const { ui, ai, executor, utils } = context;
  
  ui.log(ui.chalk.bold.cyan('\n Hello from Aura Custom Script!'));
  
  // Example: Use AI inside your script
  // const response = await ai.chat("Write a short welcome message for a Web3 explorer.");
  // ui.log(ui.chalk.green(`Aura AI says: ${response}`));
  
  // Example: Access the current wallet/executor
  // const balance = await executor.execute({ action: 'CHECK_BALANCE', token: 'ETH' });
  // ui.log(ui.chalk.white(` Current Balance: ${balance.data.balance} ETH`));

  ui.log(ui.chalk.gray('\n Script finished successfully.\n'));
}
