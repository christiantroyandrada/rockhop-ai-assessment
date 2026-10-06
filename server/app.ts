import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { BookStore } from './books/store.ts';
import { DuplicateBookError } from './books/store.ts';
import { InputError } from './books/validation.ts';
import { UpstreamError } from './books/open-library.ts';
import { createBookRouter } from './books/routes.ts';
import type { SearchQuery, SearchResponse } from '../shared/books.ts';

export function createApp({ store, search, staticDir }: {
  store: BookStore; search: (query: SearchQuery) => Promise<SearchResponse>; staticDir?: string;
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', createBookRouter(store, search));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  if (staticDir) app.use(express.static(staticDir));
  app.use((_req, res) => res.status(404).json({ error: 'Page not found.' }));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (res.headersSent) { _next(error); return; }
    if (error instanceof InputError) { res.status(400).json({ error: error.message }); return; }
    if (error instanceof DuplicateBookError) { res.status(409).json({ error: 'This book is already saved.' }); return; }
    if (error instanceof UpstreamError) { res.status(error.status).json({ error: error.message }); return; }
    if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'entity.too.large') { res.status(413).json({ error: 'Request body is too large.' }); return; }
      if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'Request body must be valid JSON.' }); return; }
    }
    console.error(JSON.stringify({ event: 'request_failed', error: error instanceof Error ? error.message : 'Unknown error' }));
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  };
  app.use(errors);
  return app;
}
