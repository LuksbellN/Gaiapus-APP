// Command line of the report precomputation (the hook to call after a publication is pinned or activated):
//   pnpm --filter @gaiapus/api reports:precompute               write the English reports of the pinned Brazilian publication
//   pnpm --filter @gaiapus/api reports:precompute -- --prune    …and remove reports of older template or text versions
//   pnpm --filter @gaiapus/api reports:check                    verify the pinned reports without writing
// Options: --source <publication dir> (default: the pinned publication), --out <reports dir> (default: the pinned
// reports), --locales en,pt-BR,es,fr,de (default: en; a publication has no user, so its first variant is English).
// Reads local directories only; it never contacts a remote service and never writes next to scientific artifacts.
import { resolve } from 'node:path';
import type { ReportLocale } from '@gaiapus/contracts';
import { LocalPublicationSource, PublicationStore, pinnedBrazilSource } from '../publication-store.js';
import { REPORT_LOCALES } from './locale.js';
import { precomputeReports } from './precompute.js';
import { PINNED_REPORTS_DIR } from './repository.js';

const args = process.argv.slice(2);
const value = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const known = new Set(['--check', '--prune', '--source', '--out', '--locales']);
for (const [i, arg] of args.entries()) if (arg.startsWith('--') ? !known.has(arg) : !['--source', '--out', '--locales'].includes(args[i - 1] ?? '')) throw new Error(`Unknown argument: ${arg}`);
const locales = (value('--locales') ?? 'en').split(',').map(l => l.trim());
for (const locale of locales) if (!(REPORT_LOCALES as readonly string[]).includes(locale)) throw new Error(`Unsupported report locale: ${locale}`);
const source = value('--source');
const store = new PublicationStore([source ? new LocalPublicationSource('local', resolve(source)) : pinnedBrazilSource()]);
const directory = value('--out') ? resolve(value('--out')!) : PINNED_REPORTS_DIR;
const check = args.includes('--check');
const outcome = await precomputeReports({ store, directory, locales: locales as ReportLocale[], check, prune: args.includes('--prune') });
console.log(JSON.stringify({ directory, check, reports: outcome.reports.length, generated: outcome.generated, reused: outcome.reused, pruned: outcome.pruned.length, stale: outcome.stale }, null, 1));
if (outcome.stale.length) { console.error(check ? 'Reports are missing or outdated: run reports:precompute (with --prune to drop older versions).' : 'Some reports could not be written or are not part of the index.'); process.exitCode = 1; }
