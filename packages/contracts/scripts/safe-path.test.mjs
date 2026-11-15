import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { childFile, sourceDirectory } from './safe-path.mjs';

const root = mkdtempSync(join(tmpdir(), 'pin-'));
mkdirSync(join(root, 'boundaries'));
writeFileSync(join(root, 'manifest.json'), '{}');

describe('pin script path guards', () => {
  it('accepts an existing source directory that has a manifest', () => {
    expect(sourceDirectory(root)).toBe(root);
  });
  it('rejects a missing argument, a file, or a directory without manifest', () => {
    expect(() => sourceDirectory(undefined)).toThrow();
    expect(() => sourceDirectory(join(root, 'manifest.json'))).toThrow();
    expect(() => sourceDirectory(join(root, 'boundaries'))).toThrow();
  });
  it('allows only plain file names inside the root', () => {
    expect(childFile(root, 'BR-5107925.json')).toBe(join(root, 'BR-5107925.json'));
    for (const bad of ['../x.json', `..${sep}x.json`, 'a/b.json', 'a\\b.json', '/etc/passwd', 'C:\\x.json', '', '.', '..', 'x.json\0']) {
      expect(() => childFile(root, bad), bad).toThrow();
    }
  });
});
