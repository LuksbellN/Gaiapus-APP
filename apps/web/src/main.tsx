import '@fontsource/bricolage-grotesque/latin-500.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-500.css';
import '@fontsource/source-sans-3/latin-600.css';
import './teammate/styles.css';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './teammate/App';
import { initializeAuth } from './features/auth/client';
import { AuthPage } from './features/auth/AuthPage';
import { initializeSessionBridge } from './teammate/adapters/session';

async function start() {
  await initializeAuth();
  await initializeSessionBridge();
  const authRoute = location.pathname === '/auth/callback' || location.pathname === '/auth/recovery';
  createRoot(document.getElementById('root')!).render(<HashRouter><App authPage={authRoute ? <AuthPage recovery={location.pathname === '/auth/recovery'} /> : undefined} /></HashRouter>);
}
start().catch(() => {
  // Message chosen by index.html in the boot language; catalogs may be the thing that failed, so it does not use i18n.
  const text = (window as { __gaiapusBoot?: string[] }).__gaiapusBoot?.[1] ?? 'Could not start. Check your connection and reload the page.';
  const main = document.createElement('main'); main.className = 'boot'; main.innerHTML = '<b translate="no">Gaiapus</b><p></p>'; main.querySelector('p')!.textContent = text;
  document.getElementById('root')!.replaceChildren(main);
});
