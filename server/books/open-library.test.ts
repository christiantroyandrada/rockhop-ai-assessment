import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookSearch, UpstreamError } from './open-library.ts';

const payload = { numFound: 13, start: 12, docs: [{ key: 'OL1W', title: 'A' }] };

test('successful search encodes user input, bounds pagination and normalizes missing metadata', async () => {
  const search = createBookSearch({ fetch: async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://openlibrary.org');
    assert.equal(url.searchParams.get('q'), 'a & b');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('limit'), '12');
    assert.equal(options?.redirect, 'error');
    assert.ok(options?.signal instanceof AbortSignal);
    return Response.json(payload);
  } });
  assert.deepEqual(await search({ q: 'a & b', page: 2 }), {
    results: [{ workId: '/works/OL1W', title: 'A', authors: [], firstPublishYear: null }], page: 2, pageSize: 12, total: 13
  });
});

test('already-prefixed keys and empty results remain successful', async () => {
  const normal = createBookSearch({ fetch: async () => Response.json({ ...payload, docs: [{ key:'/works/OL1W', title:'A', author_name:['Ada'], first_publish_year:2020 }] }) });
  assert.equal((await normal({ q:'book',page:1 })).results[0]?.firstPublishYear, 2020);
  const empty = createBookSearch({ fetch: async () => Response.json({ numFound:0,start:0,docs:[] }) });
  assert.deepEqual((await empty({q:'none',page:1})).results, []);
});

for (const status of [404, 429, 500]) test(`HTTP ${status} cannot masquerade as a successful payload`, async () => {
  const response = Response.json(payload, { status });
  const search = createBookSearch({ fetch: async () => response });
  await assert.rejects(search({q:'book',page:1}), error => error instanceof UpstreamError && error.status === 502);
  assert.equal(response.bodyUsed, true);
});

for (const [name, body] of [
  ['invalid JSON', '{'], ['missing docs', JSON.stringify({numFound:1})],
  ['invalid metadata', JSON.stringify({...payload,docs:[{key:'OL1W',title:3}]})],
  ['invalid total', JSON.stringify({...payload,numFound:-1})]
]) test(name, async () => {
  const search = createBookSearch({ fetch: async () => new Response(body) });
  await assert.rejects(search({q:'book',page:1}), error => error instanceof UpstreamError && error.status === 502);
});

test('network errors and deadline expiration receive distinct upstream codes', async () => {
  for (const [failure,status] of [[new TypeError('offline'),502], [new DOMException('timeout','TimeoutError'),504]] as const) {
    const search = createBookSearch({ fetch: async () => { throw failure; } });
    await assert.rejects(search({q:'book',page:1}), error => error instanceof UpstreamError && error.status === status);
  }
});
