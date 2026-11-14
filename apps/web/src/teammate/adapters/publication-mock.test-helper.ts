import { beforeAll, afterAll, vi } from 'vitest';
import { examples } from '@gaiapus/contracts/fixtures';

export function publicationMock() {
  beforeAll(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const path = String(input);
      const id = path.split('/examples/')[1];
      const example = examples.find(e => e.example_id === id);
      if (!example) throw new Error(`Unexpected HTTP request: ${path}`);
      return new Response(JSON.stringify({ data: example, meta: {} }), { status: 200 });
    });
  });
  afterAll(() => vi.restoreAllMocks());
}
