import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk';
import Conf from 'conf';
import dotenv from 'dotenv';
dotenv.config();

const config = new Conf({ projectName: `${process.env.SUPABASE_DATABASE_NAME}` });
const supabase = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_KEY || ''
);

export const syncActivity = async (type: string, intent: any, result: string) => {
  const walletAddress = config.get('user_wallet');

  if (!walletAddress) return;

  try {
    const { error } = await supabase.from('aura_history').insert({
      wallet_address: walletAddress,
      command_type: type,
      intent: intent,
      result: result
    });

    if (error) throw error;
  } catch (err: any) {
    console.error(chalk.red(`\n Sync Error: ${err.message}`));
  }
};