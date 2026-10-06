import assert from 'node:assert/strict';
import test from 'node:test';
import type { TestContext } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../app.ts';
import { createStore } from './store.ts';
import { UpstreamError } from './open-library.ts';
import {
  savedBookSchema,
  savedBooksSchema,
  searchResponseSchema,
  errorSchema,
} from '../../shared/books.ts';
import type { SearchQuery, SearchResponse } from '../../shared/books.ts';

const book = {
  workId: '/works/OL1W',
  title: 'A',
  authors: [],
  firstPublishYear: null,
};
async function fixture(
  t: TestContext,
  search: (query: SearchQuery) => Promise<SearchResponse> = async (query) => ({
    results: [book],
    page: query.page,
    pageSize: 12,
    total: 1,
  }),
) {
  const dir = mkdtempSync(join(tmpdir(), 'reading-http-'));
  const store = createStore(join(dir, 'books.sqlite'));
  const server = createApp({ store, search, staticDir: dir }).listen(
    0,
    '127.0.0.1',
  );
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return (path: string, method = 'GET', data?: unknown) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
}

test('HTTP CRUD persists valid edits and rejects duplicates and invalid edits', async (t) => {
  const request = await fixture(t);
  const added = await request('/api/books', 'POST', book);
  assert.equal(added.status, 201);
  const saved = savedBookSchema.parse(await added.json());
  assert.equal((await request('/api/books', 'POST', book)).status, 409);
  const updated = await request(`/api/books/${saved.id}`, 'PATCH', {
    notes: 'done',
    status: 'finished',
  });
  assert.equal(updated.status, 200);
  assert.equal(savedBookSchema.parse(await updated.json()).notes, 'done');
  assert.equal(
    (
      await request(`/api/books/${saved.id}`, 'PATCH', {
        notes: 'lost',
        status: 'wrong',
      })
    ).status,
    400,
  );
  const items = savedBooksSchema.parse(
    await (await request('/api/books')).json(),
  );
  assert.equal(items[0]?.notes, 'done');
  const removed = await request(`/api/books/${saved.id}`, 'DELETE');
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  assert.equal((await request(`/api/books/${saved.id}`, 'DELETE')).status, 404);
  assert.equal(
    (await request('/api/books/999', 'PATCH', { notes: 'missing' })).status,
    404,
  );
});

test('HTTP boundary rejects invalid IDs, query syntax, bodies and API routes', async (t) => {
  const request = await fixture(t);
  for (const id of ['0', '01', '1x', '1.5', '9007199254740992'])
    assert.equal((await request(`/api/books/${id}`, 'DELETE')).status, 400);
  for (const body of [{}, [], { ...book, extra: true }, { ...book, title: '' }])
    assert.equal((await request('/api/books', 'POST', body)).status, 400);
  assert.equal(
    (await request('/api/books/1', 'PATCH', { notes: 'a'.repeat(2001) }))
      .status,
    400,
  );
  assert.equal(
    (await request('/api/books', 'POST', { ...book, title: 'a'.repeat(17000) }))
      .status,
    413,
  );
  for (const query of ['', '?q=', '?q=a&page=0', '?q=a&page=1x', '?q=a&q=b'])
    assert.equal((await request(`/api/search${query}`)).status, 400);
  const result = await request('/api/search?q=book&page=2');
  assert.equal(result.status, 200);
  assert.equal(searchResponseSchema.parse(await result.json()).page, 2);
  const missing = await request('/api/unknown');
  assert.equal(missing.status, 404);
  assert.ok(errorSchema.parse(await missing.json()).error);
  assert.equal((await request('/missing.js')).status, 404);
});

test('malformed JSON receives a safe 400 response', async (t) => {
  const request = await fixture(t);
  // Derive the same ephemeral origin without adding a test-only production endpoint.
  const base = (await request('/api/books')).url;
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(response.status, 400);
  assert.ok(errorSchema.parse(await response.json()).error);
});

for (const status of [502, 504] as const)
  test(`upstream ${status} remains a safe HTTP error`, async (t) => {
    const request = await fixture(t, async () => {
      throw new UpstreamError(status);
    });
    const result = await request('/api/search?q=book');
    assert.equal(result.status, status);
    assert.ok(errorSchema.parse(await result.json()).error);
  });

test('unexpected errors do not expose diagnostic details', async (t) => {
  const request = await fixture(t, async () => {
    throw new Error('/private/internal secret');
  });
  const result = await request('/api/search?q=book');
  assert.equal(result.status, 500);
  assert.equal(
    errorSchema.parse(await result.json()).error,
    'An unexpected error occurred. Please try again.',
  );
});
