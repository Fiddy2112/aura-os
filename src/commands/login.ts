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

// Aura OS Style Login Page - Minimal Black & White Dark Theme
const getAuthPageHTML = (supabaseUrl: string, supabaseKey: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura OS - Connect</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fafafa;
      -webkit-font-smoothing: antialiased;
    }

    /* Grid pattern background */
    .bg-pattern {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }

    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 400px;
      padding: 20px;
    }

    .card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(39, 39, 42, 1);
      border-radius: 24px;
      padding: 48px 40px;
      backdrop-filter: blur(20px);
    }

    .logo {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px;
    }

    .logo h1 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .logo p {
      color: #71717a;
      font-size: 14px;
    }

    .connect-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-metamask {
      background: #18181b;
      border-color: #27272a;
      color: #fff;
    }

    .btn-metamask:hover:not(:disabled) {
      background: #27272a;
      border-color: #3f3f46;
      transform: translateY(-2px);
    }

    .btn-google {
      background: #18181b;
      border-color: #27272a;
      color: #fff;
    }

    .btn-google:hover:not(:disabled) {
      background: #27272a;
      border-color: #3f3f46;
      transform: translateY(-2px);
    }

    .btn-github {
      background: #fff;
      color: #000;
    }

    .btn-github:hover:not(:disabled) {
      background: #e4e4e7;
      transform: translateY(-2px);
      box-shadow: 0 10px 40px -10px rgba(255, 255, 255, 0.2);
    }

    .btn-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
      color: #52525b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #27272a;
    }

    .divider span {
      padding: 0 16px;
    }

    .status {
      text-align: center;
      margin-top: 16px;
      font-size: 13px;
      color: #71717a;
      min-height: 20px;
    }

    .status.error {
      color: #ef4444;
    }

    .status.success {
      color: #22c55e;
    }

    /* Success View */
    .success-view {
      text-align: center;
      padding: 20px 0;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
      animation: scale-in 0.3s ease-out;
    }

    @keyframes scale-in {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .success-view h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .success-view p {
      color: #71717a;
      font-size: 14px;
    }

    .success-view .hint {
      margin-top: 24px;
      font-size: 12px;
      color: #52525b;
    }

    .hidden { display: none !important; }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 11px;
      color: #52525b;
    }

    .footer a {
      color: #71717a;
      text-decoration: none;
    }

    .footer a:hover {
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  
  <div class="container">
    <div class="card">
      <!-- Connect View -->
      <div id="connectView">
        <div class="logo">
          <div class="logo-icon">
            <img src="../assets/image/logo.svg" alt="Aura OS Logo">
          </div>
          <h1>Aura OS</h1>
          <p>Connect to continue</p>
        </div>

        <div class="connect-options">
          <button class="btn btn-metamask" id="btnMetamask" onclick="connectMetaMask()">
            <span class="btn-icon">🦊</span>
            <span>Connect with MetaMask</span>
          </button>

          <div class="divider"><span>or</span></div>

          <button class="btn btn-google" id="btnGoogle" onclick="connectGoogle()">
            <span class="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            <span>Continue with Google</span>
          </button>

          <button class="btn btn-github" id="btnGithub" onclick="connectGitHub()">
            <span class="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </span>
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div id="status" class="status"></div>

        <div class="footer">
          <a href="https://auraos.dev" target="_blank">auraos.dev</a>
        </div>
      </div>

      <!-- Success View -->
      <div id="successView" class="success-view hidden">
        <div class="success-icon">✓</div>
        <h2>Connected!</h2>
        <p>You're now logged in to Aura OS</p>
        <p class="hint">You can close this window and return to your terminal</p>
      </div>
    </div>
  </div>

  <script type="module">
    // Import Supabase from CDN
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    
    const SUPABASE_URL = '${supabaseUrl}';
    const SUPABASE_KEY = '${supabaseKey}';
    
    let supabase = null;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      console.error('Supabase init error:', e);
    }

    const statusEl = document.getElementById('status');

    function showStatus(text, type = '') {
      statusEl.textContent = text;
      statusEl.className = 'status ' + type;
    }

    function setLoading(btnId, loading) {
      const btn = document.getElementById(btnId);
      if (btn && loading) {
        btn.disabled = true;
        const textSpan = btn.querySelector('span:last-child');
        if (textSpan) textSpan.innerHTML = '<span class="spinner"></span>';
      }
    }

    function resetButton(btnId, text) {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = false;
        const textSpan = btn.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = text;
      }
    }

    function showSuccess() {
      document.getElementById('connectView').classList.add('hidden');
      document.getElementById('successView').classList.remove('hidden');
      
      fetch('/auth-success').catch(() => {});
      setTimeout(() => window.close(), 2500);
    }

    // MetaMask Connect
    window.connectMetaMask = async function() {
      if (typeof window.ethereum === 'undefined') {
        showStatus('MetaMask not installed. Please install it first.', 'error');
        return;
      }

      setLoading('btnMetamask', true);
      showStatus('Connecting to MetaMask...');

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        await fetch('/auth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'metamask',
            wallet: address
          })
        });

        showSuccess();
      } catch (err) {
        showStatus(err.message || 'Connection rejected', 'error');
        resetButton('btnMetamask', 'Connect with MetaMask');
      }
    };

    // Google Connect
    window.connectGoogle = async function() {
      if (!supabase) {
        showStatus('Auth service not available', 'error');
        return;
      }

      setLoading('btnGoogle', true);
      showStatus('Redirecting to Google...');

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/oauth-callback'
          }
        });

        if (error) {
          showStatus(error.message, 'error');
          resetButton('btnGoogle', 'Continue with Google');
        }
      } catch (err) {
        showStatus(err.message || 'Google auth failed', 'error');
        resetButton('btnGoogle', 'Continue with Google');
      }
    };

    // GitHub Connect
    window.connectGitHub = async function() {
      if (!supabase) {
        showStatus('Auth service not available', 'error');
        return;
      }

      setLoading('btnGithub', true);
      showStatus('Redirecting to GitHub...');

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: window.location.origin + '/oauth-callback'
          }
        });

        if (error) {
          showStatus(error.message, 'error');
          resetButton('btnGithub', 'Continue with GitHub');
        }
      } catch (err) {
        showStatus(err.message || 'GitHub auth failed', 'error');
        resetButton('btnGithub', 'Continue with GitHub');
      }
    };

    // Handle OAuth callback
    if (supabase) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            await fetch('/auth-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: session.user.app_metadata?.provider || 'oauth',
                user: session.user,
                session: session
              })
            });
            showSuccess();
          } catch (e) {
            console.error('Callback error:', e);
          }
        }
      });
    }

    console.log('Aura OS Auth loaded');
  </script>
</body>
</html>
`;

export async function loginCommand(method?: string) {
  console.log(chalk.white.bold('\n ⚡ Aura OS\n'));

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
      const url = new URL(req.url || '', `http://localhost:${PORT}`);

      // Serve auth page
      if (url.pathname === '/' || url.pathname === '/oauth-callback') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getAuthPageHTML(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_KEY || ''
        ));
        return;
      }

      // Handle success notification
      if (url.pathname === '/auth-success') {
        res.writeHead(200);
        res.end('OK');
        return;
      }

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
              res.writeHead(200);
              res.end('OK');

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

      res.writeHead(404);
      res.end('Not found');
    });

    server.listen(PORT, async () => {
      const loginUrl = `http://localhost:${PORT}`;
      
      console.log(chalk.gray(' Opening browser...\n'));
      console.log(chalk.gray(` If browser doesn't open:`));
      console.log(chalk.white(` ${loginUrl}\n`));

      await open(loginUrl);

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