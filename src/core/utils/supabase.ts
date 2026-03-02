import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk';
import Conf from 'conf';
import dotenv from 'dotenv';
import { Sanitizer } from '../security/sanitizer.js';
dotenv.config();

// Use consistent project name 'aura-os'
const config = new Conf({ projectName: 'aura-os' });
const supabase = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_KEY || ''
);

export const syncActivity = async (type: string, intent: any, result: string) => {
  const walletAddress = config.get('user_wallet');
  const userEmail = config.get('user_email');

  // If no identifying info, we can't sync reasonably
  if (!walletAddress && !userEmail) {
      console.log(chalk.gray(' [Sync] Skipping: No wallet or email linked in local session.'));
      return;
  }

  // 🛡️ Sanitize data before it leaves the machine
  const sanitizedIntent = Sanitizer.sanitize(intent);
  const sanitizedResult = Sanitizer.sanitize(result);

  try {
    // We use 'intent' as the column name to match your database schema
    const dataToInsert = {
      wallet_address: walletAddress || 'cli_user',
      user_email: userEmail || null,
      command_type: type,
      intent: sanitizedIntent, 
      result: sanitizedResult,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('aura_history').insert(dataToInsert);

    if (error) {
        // If 'user_email' doesn't exist in your table yet, try without it
        if (error.message.includes('user_email')) {
            const fallbackData = { ...dataToInsert };
            delete (fallbackData as any).user_email;
            const fallbackResult = await supabase.from('aura_history').insert(fallbackData);
            if (!fallbackResult.error) {
                 console.log(chalk.gray(` [Sync]  Synchronized via fallback: ${type}`));
            }
        } else {
            console.error(chalk.red(`\n [Sync Error] ${error.message}`));
        }
    } else {
        console.log(chalk.gray(` [Sync]  Synchronized: ${type}`));
    }
  } catch (err: any) {
    console.error(chalk.red(`\n [Sync Exception] ${err.message}`));
  }
};