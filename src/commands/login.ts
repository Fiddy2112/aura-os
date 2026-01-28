import chalk from 'chalk';
import Conf from 'conf';
import dotenv from 'dotenv'
dotenv.config();

const config = new Conf({
    projectName: `${process.env.SUPABASE_DATABASE_NAME}`
})

export async function loginCommand(address:string){
    if(!address || !address.startsWith('0x')){
        console.log(chalk.red('\n Invalid wallet address. Please connect wallet!'));
        return;
    }

    const cleanAddress = address.toLowerCase();

    config.set('user_wallet', cleanAddress);
    config.set('login_at', new Date().toISOString());

    console.log(chalk.green(`\n Aura OS Logged in!`));
    console.log(chalk.white(` User: ${chalk.bold(cleanAddress)}`));
    console.log(chalk.gray(`\n Every command from now will be synced to your dashboard.`));
}