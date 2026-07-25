import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
// Scoped surface skin — every rule lives under [data-surface='freedomblings'],
// so these warm-paper/white+gold tokens never touch the dark platform chrome.
import './styles/freedomblings.css';

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
