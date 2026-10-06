import { Router } from 'express';
import { bookSchema, updateBookSchema, searchQuerySchema, bookIdSchema } from '../../shared/books.ts';
import type { SearchQuery, SearchResponse } from '../../shared/books.ts';
import type { BookStore } from './store.ts';
import { parseInput } from './validation.ts';

export function createBookRouter(store: BookStore, search: (query: SearchQuery) => Promise<SearchResponse>) {
  const router = Router();
  router.get('/search', async (req, res) => res.json(await search(parseInput(searchQuerySchema, req.query))));
  router.get('/books', (_req, res) => res.json(store.list()));
  router.post('/books', (req, res) => res.status(201).json(store.add(parseInput(bookSchema, req.body))));
  router.patch('/books/:id', (req, res) => {
    const id = parseInput(bookIdSchema, req.params.id);
    const book = store.update(id, parseInput(updateBookSchema, req.body));
    if (!book) { res.status(404).json({ error: 'Saved book not found.' }); return; }
    res.json(book);
  });
  router.delete('/books/:id', (req, res) => {
    const id = parseInput(bookIdSchema, req.params.id);
    if (!store.remove(id)) { res.status(404).json({ error: 'Saved book not found.' }); return; }
    res.status(204).end();
  });
  return router;
}
