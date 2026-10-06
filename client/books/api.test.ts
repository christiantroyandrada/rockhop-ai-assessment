import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { request, removeBook } from './api.ts';

test('client validates success payloads and surfaces application errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ value: 1 }));
  assert.deepEqual(
    await request('/api/example', z.object({ value: z.number() })),
    { value: 1 },
  );
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ value: 'wrong' }),
  );
  await assert.rejects(
    request('/api/example', z.object({ value: z.number() })),
    /invalid response/,
  );
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Already saved' }, { status: 409 }),
  );
  await assert.rejects(
    request('/api/example', z.object({ value: z.number() })),
    /Already saved/,
  );
});

test('network failures explain how to retry and empty DELETE responses need no JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    request('/api/books', z.array(z.unknown())),
    /connect.*try again/i,
  );
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 204 }),
  );
  await removeBook(1);
});
