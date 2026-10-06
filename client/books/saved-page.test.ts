import assert from 'node:assert/strict';
import test from 'node:test';
import type { SavedBook } from '../../shared/books.ts';
import { getSavedPage } from './saved-page.ts';

const books: SavedBook[] = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1,
  workId: `/works/OL${index + 1}W`,
  title: index === 20 ? 'The Hobbit' : `Book ${index + 1}`,
  authors: index === 20 ? ['J. R. R. Tolkien'] : [],
  firstPublishYear: null,
  status: 'want_to_read',
  notes: '',
  createdAt: '2026-10-06T00:00:00.000Z',
  updatedAt: '2026-10-06T00:00:00.000Z',
}));

test('saved pagination has stable ten-book pages and clamps after deletion', () => {
  const first = getSavedPage(books, '', 1);
  assert.deepEqual(
    first.items.map((book) => book.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(first.total, 21);
  assert.equal(first.pageCount, 3);
  assert.deepEqual(
    getSavedPage(books, '', 3).items.map((book) => book.id),
    [21],
  );
  const shortened = getSavedPage(books.slice(0, 20), '', 3);
  assert.equal(shortened.page, 2);
  assert.deepEqual(
    shortened.items.map((book) => book.id),
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  );
});

test('saved filtering matches trimmed case-insensitive titles or authors before paging', () => {
  assert.deepEqual(
    getSavedPage(books, ' HOBBIT ', 1).items.map((book) => book.id),
    [21],
  );
  const author = getSavedPage(books, 'tolkien', 3);
  assert.equal(author.total, 1);
  assert.equal(author.page, 1);
  assert.deepEqual(
    author.items.map((book) => book.id),
    [21],
  );
  const missing = getSavedPage(books, 'no match', 1);
  assert.equal(missing.total, 0);
  assert.deepEqual(missing.items, []);
  assert.deepEqual(getSavedPage([], '', 1).items, []);
});
