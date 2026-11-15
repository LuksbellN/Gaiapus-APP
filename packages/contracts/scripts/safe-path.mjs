// Path guards for the pin scripts: the CLI argument and every name read from a manifest are untrusted input.
import { existsSync, statSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

const PLAIN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Resolved source directory; it must exist and contain manifest.json. */
export function sourceDirectory(arg) {
  if (typeof arg !== 'string' || !arg.trim()) throw new Error('Usage: node scripts/pin-location-core.mjs <location-core dir>');
  const dir = resolve(arg);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error('Source is not a directory');
  if (!existsSync(join(dir, 'manifest.json'))) throw new Error('Source directory has no manifest.json');
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
