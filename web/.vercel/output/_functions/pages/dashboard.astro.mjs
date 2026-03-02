/* empty css                                */
import { e as createComponent, r as renderTemplate, n as defineScriptVars, k as renderComponent, m as maybeRenderHead } from '../chunks/astro/server_C4W-8AKg.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_D42uKeWZ.mjs';
/* empty css                                     */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const supabaseUrl = "https://vnsaxkqywsydlhjmftuw.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuc2F4a3F5d3N5ZGxoam1mdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Nzg0ODUsImV4cCI6MjA4NTE1NDQ4NX0.00vb4JUm2nT6t56EBKAEiUv3TvorgxhW6uhZKwUK0Ck";
  return renderTemplate(_a || (_a = __template(["", " <script>(function(){", `
  import { createClient } from '@supabase/supabase-js';

  const streamContainer = document.getElementById('activity-stream');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statTotal = document.getElementById('stat-total');
  const statToday = document.getElementById('stat-today');
  const statLive = document.getElementById('stat-live');
  const recentActions = document.getElementById('recent-actions');
  const btnTrader = document.getElementById('btn-mode-trader');
  const btnDev = document.getElementById('btn-mode-dev');

  let liveEventCount = 0;
  let totalCount = 0;
  let currentMode = 'TRADER'; // Default mode
  let historyData = [];

  // Toggle Logic
  btnTrader.addEventListener('click', () => setMode('TRADER'));
  btnDev.addEventListener('click', () => setMode('DEVELOPER'));

  function setMode(mode) {
    currentMode = mode;
    // Update UI
    if (mode === 'TRADER') {
      btnTrader.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black';
      btnDev.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-white';
    } else {
      btnDev.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black';
      btnTrader.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-white';
    }
    // Rerender stream
    renderStream();
  }

  function renderStream() {
    if (!streamContainer) return;
    if (historyData.length === 0) return;
    
    streamContainer.innerHTML = '';
    historyData.forEach(item => {
      streamContainer.insertAdjacentHTML('beforeend', createLogEntry(item));
    });
  }

  // Initialize Supabase client
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured');
    if (statusText) statusText.textContent = 'Not configured';
    if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load existing data
    async function loadHistory() {
      const { data, error } = await supabase
        .from('aura_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading history:', error);
        return;
      }

      if (data && data.length > 0) {
        historyData = data;
        renderStream();
        
        totalCount = data.length;
        if (statTotal) statTotal.textContent = String(totalCount);

        // Count today's commands
        const today = new Date().toDateString();
        const todayCount = data.filter(d => new Date(d.created_at).toDateString() === today).length;
        if (statToday) statToday.textContent = String(todayCount);

        // Show recent actions
        if (recentActions && data.length > 0) {
          recentActions.innerHTML = data.slice(0, 5).map(d => \`
            <div class="flex items-center gap-2 text-zinc-400">
              <span class="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px]">\${d.command_type}</span>
              <span class="truncate">\${d.result?.slice(0, 30) || 'Success'}...</span>
            </div>
          \`).join('');
        }

        data.reverse().forEach(item => {
          streamContainer.insertAdjacentHTML('afterbegin', createLogEntry(item));
        });
      }
    }

    function createLogEntry(item) {
      const time = new Date(item.created_at).toLocaleTimeString();
      const isError = item.result?.toLowerCase().includes('error');
      const borderColor = isError ? 'border-red-500/50' : 'border-white/10';
      const dotColor = isError ? 'bg-red-500' : 'bg-green-500';

      // Advanced data for Developer mode
      const rawPayload = item.payload || item.intent;
      const payload = rawPayload ? JSON.stringify(rawPayload, null, 2) : '{}';
      const address = item.wallet_address || '0x...';

      if (currentMode === 'DEVELOPER') {
        return \`
          <div class="log-entry-glow border-l-2 \${borderColor} pl-4 py-2 group hover:border-white/30 transition-all">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <div class="w-1.5 h-1.5 rounded-full \${dotColor}"></div>
                <span class="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">\${time}</span>
                <span class="px-2 py-0.5 rounded bg-zinc-900 text-purple-400 text-[9px] border border-zinc-800 font-semibold font-mono">\${item.command_type}</span>
              </div>
              <span class="text-[9px] text-zinc-700 font-mono">\${address.slice(0, 10)}...</span>
            </div>
            <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-900 font-mono text-[10px] text-zinc-500 overflow-x-auto mb-2">
              <pre>\${payload}</pre>
            </div>
            <div class="text-zinc-400 leading-relaxed text-xs">
              \${item.result || 'Executed successfully'}
            </div>
          </div>
        \`;
      }

      // Trader Mode: Simplified
      return \`
        <div class="log-entry-glow border-l-2 \${borderColor} pl-4 py-2 group hover:border-white/30 transition-all">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-1.5 h-1.5 rounded-full \${dotColor}"></div>
            <span class="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">\${time}</span>
            <span class="px-2 py-0.5 rounded bg-white text-black text-[9px] font-bold">\${item.command_type}</span>
          </div>
          <div class="text-zinc-300 leading-relaxed text-xs font-medium">
            \${item.result || 'Command finished.'}
          </div>
          <p class="text-[10px] text-zinc-600 mt-1">Transaction confirmed on chain.</p>
        </div>
      \`;
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel('aura_history_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aura_history' }, (payload) => {
        console.log('New activity:', payload);
        
        // Update local state
        historyData.unshift(payload.new);
        
        // Update stats
        liveEventCount++;
        totalCount++;
        if (statLive) statLive.textContent = String(liveEventCount);
        if (statTotal) statTotal.textContent = String(totalCount);

        const todayEl = document.getElementById('stat-today');
        if (todayEl) todayEl.textContent = String(parseInt(todayEl.textContent || '0') + 1);
        
        // Render new entry
        if (streamContainer) {
           streamContainer.insertAdjacentHTML('afterbegin', createLogEntry(payload.new));
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-green-500';
          if (statusText) statusText.textContent = 'Connected';
        } else if (status === 'CHANNEL_ERROR') {
          if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
          if (statusText) statusText.textContent = 'Error';
        }
      });

    // Load initial data
    loadHistory();
  }
})();</script> `], ["", " <script>(function(){", `
  import { createClient } from '@supabase/supabase-js';

  const streamContainer = document.getElementById('activity-stream');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statTotal = document.getElementById('stat-total');
  const statToday = document.getElementById('stat-today');
  const statLive = document.getElementById('stat-live');
  const recentActions = document.getElementById('recent-actions');
  const btnTrader = document.getElementById('btn-mode-trader');
  const btnDev = document.getElementById('btn-mode-dev');

  let liveEventCount = 0;
  let totalCount = 0;
  let currentMode = 'TRADER'; // Default mode
  let historyData = [];

  // Toggle Logic
  btnTrader.addEventListener('click', () => setMode('TRADER'));
  btnDev.addEventListener('click', () => setMode('DEVELOPER'));

  function setMode(mode) {
    currentMode = mode;
    // Update UI
    if (mode === 'TRADER') {
      btnTrader.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black';
      btnDev.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-white';
    } else {
      btnDev.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black';
      btnTrader.className = 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-white';
    }
    // Rerender stream
    renderStream();
  }

  function renderStream() {
    if (!streamContainer) return;
    if (historyData.length === 0) return;
    
    streamContainer.innerHTML = '';
    historyData.forEach(item => {
      streamContainer.insertAdjacentHTML('beforeend', createLogEntry(item));
    });
  }

  // Initialize Supabase client
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured');
    if (statusText) statusText.textContent = 'Not configured';
    if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load existing data
    async function loadHistory() {
      const { data, error } = await supabase
        .from('aura_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading history:', error);
        return;
      }

      if (data && data.length > 0) {
        historyData = data;
        renderStream();
        
        totalCount = data.length;
        if (statTotal) statTotal.textContent = String(totalCount);

        // Count today's commands
        const today = new Date().toDateString();
        const todayCount = data.filter(d => new Date(d.created_at).toDateString() === today).length;
        if (statToday) statToday.textContent = String(todayCount);

        // Show recent actions
        if (recentActions && data.length > 0) {
          recentActions.innerHTML = data.slice(0, 5).map(d => \\\`
            <div class="flex items-center gap-2 text-zinc-400">
              <span class="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px]">\\\${d.command_type}</span>
              <span class="truncate">\\\${d.result?.slice(0, 30) || 'Success'}...</span>
            </div>
          \\\`).join('');
        }

        data.reverse().forEach(item => {
          streamContainer.insertAdjacentHTML('afterbegin', createLogEntry(item));
        });
      }
    }

    function createLogEntry(item) {
      const time = new Date(item.created_at).toLocaleTimeString();
      const isError = item.result?.toLowerCase().includes('error');
      const borderColor = isError ? 'border-red-500/50' : 'border-white/10';
      const dotColor = isError ? 'bg-red-500' : 'bg-green-500';

      // Advanced data for Developer mode
      const rawPayload = item.payload || item.intent;
      const payload = rawPayload ? JSON.stringify(rawPayload, null, 2) : '{}';
      const address = item.wallet_address || '0x...';

      if (currentMode === 'DEVELOPER') {
        return \\\`
          <div class="log-entry-glow border-l-2 \\\${borderColor} pl-4 py-2 group hover:border-white/30 transition-all">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <div class="w-1.5 h-1.5 rounded-full \\\${dotColor}"></div>
                <span class="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">\\\${time}</span>
                <span class="px-2 py-0.5 rounded bg-zinc-900 text-purple-400 text-[9px] border border-zinc-800 font-semibold font-mono">\\\${item.command_type}</span>
              </div>
              <span class="text-[9px] text-zinc-700 font-mono">\\\${address.slice(0, 10)}...</span>
            </div>
            <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-900 font-mono text-[10px] text-zinc-500 overflow-x-auto mb-2">
              <pre>\\\${payload}</pre>
            </div>
            <div class="text-zinc-400 leading-relaxed text-xs">
              \\\${item.result || 'Executed successfully'}
            </div>
          </div>
        \\\`;
      }

      // Trader Mode: Simplified
      return \\\`
        <div class="log-entry-glow border-l-2 \\\${borderColor} pl-4 py-2 group hover:border-white/30 transition-all">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-1.5 h-1.5 rounded-full \\\${dotColor}"></div>
            <span class="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">\\\${time}</span>
            <span class="px-2 py-0.5 rounded bg-white text-black text-[9px] font-bold">\\\${item.command_type}</span>
          </div>
          <div class="text-zinc-300 leading-relaxed text-xs font-medium">
            \\\${item.result || 'Command finished.'}
          </div>
          <p class="text-[10px] text-zinc-600 mt-1">Transaction confirmed on chain.</p>
        </div>
      \\\`;
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel('aura_history_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aura_history' }, (payload) => {
        console.log('New activity:', payload);
        
        // Update local state
        historyData.unshift(payload.new);
        
        // Update stats
        liveEventCount++;
        totalCount++;
        if (statLive) statLive.textContent = String(liveEventCount);
        if (statTotal) statTotal.textContent = String(totalCount);

        const todayEl = document.getElementById('stat-today');
        if (todayEl) todayEl.textContent = String(parseInt(todayEl.textContent || '0') + 1);
        
        // Render new entry
        if (streamContainer) {
           streamContainer.insertAdjacentHTML('afterbegin', createLogEntry(payload.new));
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-green-500';
          if (statusText) statusText.textContent = 'Connected';
        } else if (status === 'CHANNEL_ERROR') {
          if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
          if (statusText) statusText.textContent = 'Error';
        }
      });

    // Load initial data
    loadHistory();
  }
})();</script> `])), renderComponent($$result, "Layout", $$Layout, { "title": "Aura OS | Dashboard", "data-astro-cid-3nssi2tu": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="min-h-screen bg-black grid-pattern py-10" data-astro-cid-3nssi2tu> <div class="section-container" data-astro-cid-3nssi2tu> <header class="mb-10 animate-fade-in-up flex items-center justify-between" data-astro-cid-3nssi2tu> <div data-astro-cid-3nssi2tu> <h1 class="text-4xl md:text-5xl font-bold gradient-text-shimmer tracking-tighter" data-astro-cid-3nssi2tu>AURA_STREAM</h1> <p class="text-zinc-500 font-mono text-xs mt-2 uppercase tracking-[0.3em]" data-astro-cid-3nssi2tu>Real-time Ledger Synchronization</p> </div> <div class="flex items-center gap-4" data-astro-cid-3nssi2tu> <!-- Mode Toggle --> <div class="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-hidden" data-astro-cid-3nssi2tu> <button id="btn-mode-trader" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black" data-astro-cid-3nssi2tu>TRADER</button> <button id="btn-mode-dev" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-white" data-astro-cid-3nssi2tu>DEVELOPER</button> </div> <div id="connection-status" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800" data-astro-cid-3nssi2tu> <div class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" id="status-dot" data-astro-cid-3nssi2tu></div> <span class="text-xs font-mono text-zinc-400" id="status-text" data-astro-cid-3nssi2tu>Connecting...</span> </div> </div> </header> <!-- Stats Row --> <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-astro-cid-3nssi2tu> <div class="glass-card p-4" data-astro-cid-3nssi2tu> <div class="text-xs text-zinc-500 font-mono uppercase mb-1" data-astro-cid-3nssi2tu>Total Commands</div> <div class="text-2xl font-bold text-white" id="stat-total" data-astro-cid-3nssi2tu>0</div> </div> <div class="glass-card p-4" data-astro-cid-3nssi2tu> <div class="text-xs text-zinc-500 font-mono uppercase mb-1" data-astro-cid-3nssi2tu>Today</div> <div class="text-2xl font-bold text-white" id="stat-today" data-astro-cid-3nssi2tu>0</div> </div> <div class="glass-card p-4" data-astro-cid-3nssi2tu> <div class="text-xs text-zinc-500 font-mono uppercase mb-1" data-astro-cid-3nssi2tu>Success Rate</div> <div class="text-2xl font-bold text-green-400" id="stat-success" data-astro-cid-3nssi2tu>100%</div> </div> <div class="glass-card p-4" data-astro-cid-3nssi2tu> <div class="text-xs text-zinc-500 font-mono uppercase mb-1" data-astro-cid-3nssi2tu>Live Events</div> <div class="text-2xl font-bold text-purple-400" id="stat-live" data-astro-cid-3nssi2tu>0</div> </div> </div> <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" data-astro-cid-3nssi2tu> <!-- Main Activity Stream --> <div class="lg:col-span-8 bento-card min-h-[500px] flex flex-col p-0 overflow-hidden" data-astro-cid-3nssi2tu> <div class="terminal-header bg-zinc-900/50" data-astro-cid-3nssi2tu> <div class="flex gap-1.5" data-astro-cid-3nssi2tu> <div class="terminal-dot bg-red-500" data-astro-cid-3nssi2tu></div> <div class="terminal-dot bg-yellow-500" data-astro-cid-3nssi2tu></div> <div class="terminal-dot bg-green-500" data-astro-cid-3nssi2tu></div> </div> <span class="text-[10px] font-mono text-zinc-500 ml-4 uppercase tracking-widest" data-astro-cid-3nssi2tu>Live_Activity_Feed</span> </div> <div id="activity-stream" class="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-4" data-astro-cid-3nssi2tu> <div class="flex items-center justify-center h-full text-zinc-600" data-astro-cid-3nssi2tu> <div class="text-center" data-astro-cid-3nssi2tu> <div class="animate-pulse mb-2" data-astro-cid-3nssi2tu>●●●</div> <div data-astro-cid-3nssi2tu>Waiting for commands...</div> <div class="text-xs mt-2 text-zinc-700" data-astro-cid-3nssi2tu>Run <code class="px-2 py-0.5 bg-zinc-800 rounded" data-astro-cid-3nssi2tu>aura chat</code> in your terminal</div> </div> </div> </div> </div> <!-- Sidebar --> <div class="lg:col-span-4 space-y-6" data-astro-cid-3nssi2tu> <!-- Wallet Status --> <div class="bento-card" data-astro-cid-3nssi2tu> <div class="flex items-center justify-between mb-4" data-astro-cid-3nssi2tu> <h3 class="text-white font-bold text-sm font-mono" data-astro-cid-3nssi2tu>WALLET_STATUS</h3> <div class="w-2 h-2 rounded-full bg-zinc-600" id="wallet-indicator" data-astro-cid-3nssi2tu></div> </div> <div id="connected-wallet" class="text-zinc-500 text-xs break-all font-mono" data-astro-cid-3nssi2tu>
Not connected
</div> </div> <!-- Recent Actions --> <div class="bento-card" data-astro-cid-3nssi2tu> <h3 class="text-white font-bold text-sm font-mono mb-4" data-astro-cid-3nssi2tu>RECENT_ACTIONS</h3> <div id="recent-actions" class="space-y-2 text-xs" data-astro-cid-3nssi2tu> <div class="text-zinc-600 italic" data-astro-cid-3nssi2tu>No recent actions</div> </div> </div> <!-- Info Card --> <div class="bento-card border-dashed border-zinc-800 bg-transparent" data-astro-cid-3nssi2tu> <p class="text-[10px] text-zinc-600 leading-relaxed uppercase" data-astro-cid-3nssi2tu>
This dashboard displays real-time activity from your Aura OS CLI. 
              Only authorized commands from linked sessions appear here.
</p> </div> </div> </div> </div> </main> ` }), defineScriptVars({ supabaseUrl, supabaseKey }));
}, "C:/workspace/Web3/aura-os/web/src/pages/dashboard.astro", void 0);
const $$file = "C:/workspace/Web3/aura-os/web/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
