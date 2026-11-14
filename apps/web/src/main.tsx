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
  document.getElementById('root')!.innerHTML = '<main class="boot"><b>Gaiapus</b><p>Não foi possível iniciar. Confira a conexão e recarregue a página.</p></main>';
});
