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
// event for exactly that case — reload once to pick up the fresh index.
// (Session-scoped guard prevents a reload loop if the network itself is down.)
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
