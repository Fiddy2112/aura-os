import chalk from 'chalk';
import Conf from 'conf';
import crypto from 'crypto';
import open from 'open';
import { createClient } from '@supabase/supabase-js';

const config = new Conf({ projectName: 'aura-os' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const PROD_WEB_APP = 'https://aura-os-self.vercel.app';
const isDev = process.env.NODE_ENV === 'development' || process.env.AURA_ENV === 'development';
const BASE_WEB_APP = process.env.WEB_APP_URL || (isDev ? 'http://localhost:4321' : PROD_WEB_APP);
const WEB_APP_LOGIN_URL = new URL('/login', BASE_WEB_APP).toString();

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 120; // 10 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────

async function cleanupSession(sessionId: string) {
  if (!supabase) return;
  try {
    await supabase.from('cli_sessions').delete().eq('session_id', sessionId);
  } catch {
    // best-effort cleanup, don't throw
  }
}

function saveMetaMaskSession(wallet: string) {
  config.set('user_wallet', wallet.toLowerCase());
  config.set('auth_provider', 'metamask');
  config.set('login_at', new Date().toISOString());
}

function saveOAuthSession(payload: any) {
  config.set('user_id', payload.user.id);
  config.set('user_email', payload.user.email);
  config.set('auth_provider', payload.provider);
  config.set('login_at', new Date().toISOString());

  if (payload.session?.access_token) {
    config.set('access_token', payload.session.access_token);
    config.set('refresh_token', payload.session.refresh_token);
  }
}

function printAlreadyLoggedIn() {
  const email  = config.get('user_email')  as string | undefined;
  const wallet = config.get('user_wallet') as string | undefined;

  console.log(chalk.gray('\n Already connected as:'));
  if (email)  console.log(chalk.white(`   ${email}`));
  if (wallet) console.log(chalk.white(`   ${wallet}`));
  console.log(chalk.gray('\n Run "aura logout" to disconnect.\n'));
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function loginCommand(method?: string) {
  console.log(chalk.white.bold('\n Aura OS\n'));

  // Legacy: direct wallet address passed as argument
  if (method?.startsWith('0x')) {
    config.set('user_wallet', method.toLowerCase());
    config.set('login_at', new Date().toISOString());
    console.log(chalk.green(` Connected: ${method.toLowerCase()}\n`));
    return;
  }

  // Already logged in
  if (config.get('user_email') || config.get('user_wallet')) {
    printAlreadyLoggedIn();
    return;
  }

  if (!supabase) {
    console.log(chalk.red(
      '\n Supabase is not configured.\n' +
      chalk.gray(' Add SUPABASE_URL and SUPABASE_KEY to your .env file.\n')
    ));
    return;
  }

  console.log(chalk.gray(' Initiating login sequence...'));

  // ── Create session in Supabase ─────────────────────────────────────────
  const sessionId = `cli_${crypto.randomUUID()}`;

  const { error: insertError } = await supabase
    .from('cli_sessions')
    .insert([{ session_id: sessionId, payload: null }]);

  if (insertError) {
    console.error(
      chalk.red('\n Failed to initialize auth session.\n') +
      chalk.gray(`  Supabase error: ${insertError.message}\n`) +
      chalk.gray('  Check your SUPABASE_URL, SUPABASE_KEY, and table RLS policies.\n')
    );
    return;
  }

  // ── Open browser ───────────────────────────────────────────────────────
  const loginUrl = new URL(WEB_APP_LOGIN_URL);
  loginUrl.searchParams.set('session_id', sessionId);
  const finalUrl = loginUrl.toString();

  console.log(chalk.gray('\n Opening browser to:\n'));
  console.log(chalk.cyan(`   ${finalUrl}\n`));
  console.log(chalk.gray(' If the browser did not open, paste the URL above manually.\n'));

  try {
    await open(finalUrl);
  } catch {
    // URL already printed above, user can open manually
  }

  // ── Poll for payload ───────────────────────────────────────────────────
  console.log(chalk.gray(' Waiting for authentication'), chalk.gray('(timeout: 10 min)...'));

  await new Promise<void>((resolve) => {
    let attempts = 0;
    let settled  = false;

    const done = async (sessionIdToClean?: string) => {
      if (settled) return;
      settled = true;
      clearInterval(pollInterval);
      if (sessionIdToClean) await cleanupSession(sessionIdToClean);
      resolve();
    };

    const pollInterval = setInterval(async () => {
      attempts++;

      // Timeout guard
      if (attempts >= MAX_ATTEMPTS) {
        console.log(chalk.yellow('\n Login timed out after 10 minutes.\n'));
        await done(sessionId);
        return;
      }

      // Show progress every ~60 seconds
      if (attempts % 12 === 0) {
        const minutesLeft = Math.round(((MAX_ATTEMPTS - attempts) * POLL_INTERVAL_MS) / 60000);
        process.stdout.write(chalk.gray(`\r Waiting... (${minutesLeft} min remaining)   `));
      }

      let data: any, error: any;
      try {
        ({ data, error } = await supabase!
          .from('cli_sessions')
          .select('payload')
          .eq('session_id', sessionId)
          .single());
      } catch (networkErr) {
        // Transient network error — keep polling
        return;
      }

      // Supabase query error (not "row not found")
      if (error && error.code !== 'PGRST116') {
        console.error(chalk.red(`\n Supabase poll error: ${error.message}\n`));
        await done(sessionId);
        return;
      }

      if (!data?.payload) return; // Not authenticated yet

      // ── Handle authenticated payload ────────────────────────────────
      const payload = data.payload;

      if (payload.provider === 'metamask' && payload.wallet) {
        saveMetaMaskSession(payload.wallet);
        console.log(chalk.green.bold('\n\n ✓ Connected via MetaMask\n'));
        console.log(chalk.gray(' Wallet:'), chalk.white(payload.wallet));

      } else if (payload.user) {
        saveOAuthSession(payload);
        console.log(chalk.green.bold('\n\n ✓ Connected via'), chalk.green.bold(payload.provider ?? 'OAuth'));
        console.log(chalk.gray('\n'));
        console.log(chalk.gray(' Email:'), chalk.white(payload.user.email));

      } else {
        console.log(chalk.red('\n Unknown payload format received. Login aborted.\n'));
        await done(sessionId);
        return;
      }

      console.log(chalk.gray('\n Commands will now sync to your dashboard.\n'));
      await done(sessionId);

    }, POLL_INTERVAL_MS);
  });
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutCommand() {
  const keys = [
    'user_id', 'user_email', 'user_wallet',
    'access_token', 'refresh_token',
    'auth_provider', 'login_at',
  ];
  keys.forEach(k => config.delete(k));
  console.log(chalk.green('\n ✓ Disconnected\n'));
}