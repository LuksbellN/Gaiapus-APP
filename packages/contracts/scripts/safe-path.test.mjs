import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { childFile, sourceDirectory } from './safe-path.mjs';

const root = mkdtempSync(join(tmpdir(), 'pin-'));
mkdirSync(join(root, 'boundaries'));
writeFileSync(join(root, 'manifest.json'), '{}');

describe('pin script path guards', () => {
  it('uses the current directory as source when it has a manifest (no path from the command line)', () => {
    const here = process.cwd();
    try {
      process.chdir(root);
      expect(sourceDirectory()).toBe(realpathSync(root));
      process.chdir(join(root, 'boundaries'));
      expect(() => sourceDirectory()).toThrow();
    } finally { process.chdir(here); }
  });
  it('allows only plain file names inside the root', () => {
    expect(childFile(root, 'BR-5107925.json')).toBe(join(root, 'BR-5107925.json'));
    for (const bad of ['../x.json', `..${sep}x.json`, 'a/b.json', 'a\\b.json', '/etc/passwd', 'C:\\x.json', '', '.', '..', 'x.json\0']) {
      expect(() => childFile(root, bad), bad).toThrow();
    }
  });
});
