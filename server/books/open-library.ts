import { setTimeout as wait } from 'node:timers/promises';
import { z } from 'zod';
import { bookSchema, searchResponseSchema } from '../../shared/books.ts';
import type { SearchQuery, SearchResponse } from '../../shared/books.ts';

export class UpstreamError extends Error {
  readonly status: 502 | 504;
  constructor(status: 502 | 504) {
    super(status === 504 ? 'Book search timed out. Please try again.' : 'Book search is unavailable. Please try again.');
    this.status = status;
  }
}
const upstreamSchema = z.object({
  numFound: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  docs: z.array(z.object({
    key: z.string().regex(/^(?:\/works\/)?OL\d+W$/),
    title: z.string(),
    author_name: z.array(z.string()).optional(),
    first_publish_year: z.number().optional()
  })).max(12)
});

export function createBookSearch(options: { fetch?: typeof fetch; wait?: (ms: number) => Promise<void>; now?: () => number } = {}) {
  const request = options.fetch ?? fetch;
  const pause = options.wait ?? (async ms => { await wait(ms); });
  const now = options.now ?? Date.now;
  const cache = new Map<string, { expiresAt: number; result: SearchResponse }>();
  let nextRequestAt = 0;
  return async ({ q, page }: SearchQuery): Promise<SearchResponse> => {
    const key = JSON.stringify([q.trim(), page]);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) return cached.result;
    cache.delete(key);
    // Stay within the public API's one-request-per-second baseline, including concurrent calls.
    const start = Math.max(now(), nextRequestAt);
    nextRequestAt = start + 1000;
    await pause(Math.max(0, start - now()));
    const url = new URL('https://openlibrary.org/search.json');
    url.search = new URLSearchParams({ q, page: String(page), limit: '12', fields: 'key,title,author_name,first_publish_year' }).toString();
    const signal = AbortSignal.timeout(8000);
    try {
      const response = await request(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'RockhopReadingList/1.0 (https://github.com/christiantroyandrada/rockhop-ai-assessment)' },
        redirect: 'error', signal
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new UpstreamError(502);
      }
      const raw: unknown = await response.json();
      const data = upstreamSchema.parse(raw);
      const result = searchResponseSchema.parse({
        results: data.docs.map(doc => bookSchema.parse({
          workId: doc.key.startsWith('/works/') ? doc.key : `/works/${doc.key}`,
          title: doc.title, authors: doc.author_name ?? [], firstPublishYear: doc.first_publish_year ?? null
        })), page, pageSize: 12, total: data.numFound
      });
      cache.set(key, { expiresAt: now() + 60000, result });
      if (cache.size > 100) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return result;
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      if (signal.aborted || (error instanceof DOMException && error.name === 'TimeoutError')) throw new UpstreamError(504);
      throw new UpstreamError(502);
    }
  };
}
