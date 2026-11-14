import { describe, expect, it } from 'vitest';
import { callbackProblem, authRedirect, safeReturnPath } from './urls';

describe('authentication URLs', () => {
  it('uses the actual origin and exact callback paths', () => {
    expect(authRedirect('callback', 'http://localhost:5173')).toBe('http://localhost:5173/auth/callback');
    expect(authRedirect('recovery', 'http://127.0.0.1:5180')).toBe('http://127.0.0.1:5180/auth/recovery');
  });
  it('only restores public exploration on this origin', () => {
    expect(safeReturnPath('/?area=123')).toBe('/?area=123');
    for (const path of ['//evil.test', 'https://evil.test', '/auth/callback?code=secret', '/\\evil.test']) {
      expect(safeReturnPath(path)).toBe('/');
    }
  });
  it('recognizes expired and missing email links without echoing provider input', () => {
    expect(callbackProblem(new URL('http://localhost/auth/callback#error=access_denied&error_description=secret'))).toMatch(/expirou/);
    expect(callbackProblem(new URL('http://localhost/auth/callback'))).toMatch(/incompleto/);
    expect(callbackProblem(new URL('http://localhost/auth/callback?code=abc'))).toBeNull();
  });
});
