import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
// SHELL_PKG1 — the ONE shell (ONE_ROOF v2). Its scoped tokens + the Supabase
// handle it reads through; the component itself is imported where it's mounted.
import '@honeycomb/shell/shell.css';
// PROFILE_SHARED1 — the ONE Bee profile's scoped tokens, extending the same
// .astra-shell scope shell.css defines. Import after shell.css.
import '@honeycomb/profile/profile.css';
import { setShellSupabase } from '@honeycomb/shell';
import { supabase } from '@/lib/supabase';
// Scoped surface skin — every rule lives under [data-surface='freedomblings'],
// so these warm-paper/white+gold tokens never touch the dark platform chrome.
import './styles/freedomblings.css';
// Light-theme literal remap for pages written against the retired white shell.
import './styles/dark-remap.css';

setShellSupabase(supabase);

// A mid-session redeploy invalidates the previous build's chunk URLs; a lazy
// route or dynamic import then 404s and the page dies black. Vite emits this
// event for exactly that case — reload to pick up the fresh index.
//
// Rate-limited: at most one auto-reload per 15 seconds. The event fires per
// failed import attempt (not on a timer), so a persistently broken deploy gets
// one reload, then stays put until the next attempt outside the window.
//
// preventDefault() is deliberately first and unconditional — a raw unhandled
// rejection during the cooldown helps nobody. Don't move it below the guard.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const KEY = 'hc_chunk_reload_at';
  const last = Number(sessionStorage.getItem(KEY) ?? '0');
  if (Date.now() - last < 15000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
