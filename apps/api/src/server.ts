import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, type Dependencies } from './app.js';
import { supabaseDependencies } from './plugins/supabase.js';
import { LiveExecutor } from './modules/analysis/executor.js';
import { loadLiveCapabilities } from './modules/analysis/capabilities.js';
import { reportServiceFromEnv, simulationStoreFromEnv } from './modules/simulations/config.js';
import { warmReports } from './modules/simulations/reports/service.js';
const env = process.env;
const dependencies: Dependencies = { logger: true };
if (!!env.SUPABASE_URL !== !!env.SUPABASE_PUBLISHABLE_KEY) throw new Error('Configure both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY');
if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY) Object.assign(dependencies, supabaseDependencies({ url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY, signingKey: env.APP_STORAGE_SIGNING_KEY }));
dependencies.simulations = simulationStoreFromEnv(env);
dependencies.reports = reportServiceFromEnv(env, dependencies.simulations);
if (env.REPORT_WARM !== undefined && env.REPORT_WARM !== 'on' && env.REPORT_WARM !== 'off') throw new Error('REPORT_WARM must be on or off');
const mode = env.SCIENCE_MODE ?? 'fixture';
if (mode !== 'fixture' && mode !== 'live') throw new Error('SCIENCE_MODE must be fixture or live');
if (mode === 'live') {
  if (!env.SCIENCE_ADAPTER_URL || !env.SCIENCE_INTERNAL_TOKEN || env.SCIENCE_INTERNAL_TOKEN.length < 32) throw new Error('Live science requires an internal adapter URL and token of at least 32 characters');
  const deadline = Number(env.SCIENCE_DEADLINE_MS ?? 130000);
  if (!Number.isInteger(deadline) || deadline < 1 || deadline > 300000) throw new Error('SCIENCE_DEADLINE_MS must be 1..300000');
  dependencies.executor = new LiveExecutor(env.SCIENCE_ADAPTER_URL, env.SCIENCE_INTERNAL_TOKEN, deadline);
  const adapterUrl = env.SCIENCE_ADAPTER_URL, internalToken = env.SCIENCE_INTERNAL_TOKEN;
  dependencies.capabilitiesProvider = () => loadLiveCapabilities(adapterUrl, internalToken);
}
const defaultFrontend = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const frontendDir = env.FRONTEND_DIST_DIR ? resolve(env.FRONTEND_DIST_DIR) : defaultFrontend;
if (existsSync(resolve(frontendDir, 'index.html'))) dependencies.frontendDir = frontendDir;
const app = createApp(dependencies);
const port = Number(env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => process.exit(0)); });
await app.listen({ host: env.HOST ?? '127.0.0.1', port });
// A publication has no user: its first report is the English one. The pinned Brazilian runs have it precomputed.
// REPORT_WARM=on also ensures it, in the background at start-up, for every public run the sources list. It is opt-in
// because that reads every run and series of every source: a remote batch can hold hundreds of runs. Without it the
// English report of such a run is created by the first request. A failure here never affects the simulations.
if (env.REPORT_WARM === 'on') void warmReports(dependencies.reports, dependencies.simulations, (runId, message) => app.log.warn({ run_id: runId, message }, 'simulation report warm-up failed'))
  .then(outcome => app.log.info(outcome, 'simulation reports ensured at start-up'), () => app.log.warn('simulation report warm-up could not list the publications'));
