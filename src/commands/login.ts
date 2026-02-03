import chalk from 'chalk';
import Conf from 'conf';
import http from 'http';
import open from 'open';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const config = new Conf({
  projectName: `${process.env.SUPABASE_DATABASE_NAME}`
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const PORT = 9876;

// Aura OS Login Config - Web App URL
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:4321/login';

export async function loginCommand(method?: string) {
  console.log(chalk.white.bold('\n Aura OS\n'));

  // Legacy: if wallet address provided directly
  if (method && method.startsWith('0x')) {
    const cleanAddress = method.toLowerCase();
    config.set('user_wallet', cleanAddress);
    config.set('login_at', new Date().toISOString());
    console.log(chalk.green(` Connected: ${cleanAddress}\n`));
    return;
  }

  // Check if already logged in
  const existingUser = config.get('user_email') as string;
  const existingWallet = config.get('user_wallet') as string;
  if (existingUser || existingWallet) {
    console.log(chalk.gray(` Already connected as:`));
    if (existingUser) console.log(chalk.white(`   ${existingUser}`));
    if (existingWallet) console.log(chalk.white(`   ${existingWallet}`));
    console.log(chalk.gray('\n Run "aura logout" to disconnect.\n'));
    return;
  }

  console.log(chalk.gray(' Starting auth server...'));

  return new Promise<void>((resolve) => {
    let authCompleted = false;

    const server = http.createServer(async (req, res) => {
      // CORS Headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://localhost:${PORT}`);

      // Handle auth callback
      if (url.pathname === '/auth-callback' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            
            // MetaMask login
            if (data.provider === 'metamask' && data.wallet) {
              config.set('user_wallet', data.wallet.toLowerCase());
              config.set('auth_provider', 'metamask');
              config.set('login_at', new Date().toISOString());
              
              authCompleted = true;
              console.log(chalk.green.bold('\n ✓ Connected\n'));
              console.log(chalk.gray(' Wallet:'), chalk.white(data.wallet));
            }
            // OAuth login (Google/GitHub)
            else if (data.user) {
              config.set('user_id', data.user.id);
              config.set('user_email', data.user.email);
              config.set('auth_provider', data.provider);
              config.set('login_at', new Date().toISOString());
              
              if (data.session?.access_token) {
                config.set('access_token', data.session.access_token);
                config.set('refresh_token', data.session.refresh_token);
              }

              authCompleted = true;
              console.log(chalk.green.bold('\n ✓ Connected\n'));
              console.log(chalk.gray(' Email:'), chalk.white(data.user.email));
            }

            if (authCompleted) {
              console.log(chalk.gray('\n Commands will now sync to your dashboard.\n'));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));

              setTimeout(() => {
                server.close();
                resolve();
              }, 1000);
            }
          } catch (err) {
            console.error(chalk.red(' Auth error'));
            res.writeHead(400);
            res.end('Error');
          }
        });
        return;
      }

      // Default fallback
      res.writeHead(200);
      res.end('Aura OS CLI Auth Server');
    });

    server.listen(PORT, async () => {
      console.log(chalk.gray(' Opening browser...\n'));
      console.log(chalk.gray(` Waiting for login at ${WEB_APP_URL}...`));

      await open(WEB_APP_URL);

      // Timeout
      setTimeout(() => {
        if (!authCompleted) {
          console.log(chalk.yellow('\n Connection timed out.\n'));
          server.close();
          resolve();
        }
      }, 10 * 60 * 1000);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(chalk.red(` Port ${PORT} in use. Close other login process.\n`));
      }
      resolve();
    });
  });
}

export async function logoutCommand() {
  config.delete('user_id');
  config.delete('user_email');
  config.delete('user_wallet');
  config.delete('access_token');
  config.delete('refresh_token');
  config.delete('auth_provider');
  config.delete('login_at');
  
  console.log(chalk.green('\n ✓ Disconnected\n'));
}