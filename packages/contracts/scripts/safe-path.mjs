// Path guards for the pin scripts: the source is the working directory and every name read from a manifest is untrusted.
import { existsSync, realpathSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

const PLAIN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The source is the current working directory (no path is taken from the command line); it must contain manifest.json. */
export function sourceDirectory() {
  const dir = realpathSync(process.cwd());
  if (!existsSync(join(dir, 'manifest.json'))) throw new Error('Run from the location-core directory: cd <Gaiapus_nasa>/data/serving/location-core && node <Gaiapus-APP>/packages/contracts/scripts/pin-location-core.mjs');
  return dir;
}

/** `root/name` for a plain file name only (no separators, no traversal, no absolute or drive paths). */
export function childFile(root, name) {
  if (typeof name !== 'string' || !PLAIN_NAME.test(name) || name.includes('..') || basename(name) !== name) throw new Error('Unsafe file name in manifest');
  const base = resolve(root);
  const full = resolve(base, name);
  if (!full.startsWith(base + sep)) throw new Error('Unsafe file name in manifest');
  return full;
}
