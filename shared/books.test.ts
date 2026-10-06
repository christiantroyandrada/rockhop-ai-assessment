/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { bookSchema, updateBookSchema, searchQuerySchema, bookIdSchema } from './books.ts';

const book = { workId: '/works/OL1W', title: 'A', authors: [], firstPublishYear: null };

test('accepts exact book limits and rejects malformed metadata', () => {
  assert.equal(bookSchema.safeParse(book).success, true);
  assert.equal(bookSchema.safeParse({ ...book, title: 'a'.repeat(300), authors: Array(20).fill('a'.repeat(200)), firstPublishYear: 9999 }).success, true);
  for (const patch of [
    { workId: 'https://example.com' }, { title: '   ' }, { title: 'a'.repeat(301) },
    { authors: Array(21).fill('A') }, { authors: ['a'.repeat(201)] }, { authors: [' '] },
    { firstPublishYear: -1 }, { firstPublishYear: 10000 }, { firstPublishYear: 1.5 }, { extra: true }
  ]) assert.equal(bookSchema.safeParse({ ...book, ...patch }).success, false, JSON.stringify(patch));
  assert.equal(bookSchema.safeParse([]).success, false);
});

test('edits require at least one allowed field without discarding empty notes', () => {
  for (const status of ['want_to_read', 'reading', 'finished']) assert.equal(updateBookSchema.safeParse({ status }).success, true);
  assert.equal(updateBookSchema.safeParse({ notes: '' }).success, true);
  assert.equal(updateBookSchema.safeParse({ notes: 'a'.repeat(2000) }).success, true);
  for (const value of [{}, [], { notes: 1 }, { notes: 'a'.repeat(2001) }, { status: 'other' }, { notes: '', title: 'other' }]) {
    assert.equal(updateBookSchema.safeParse(value).success, false);
  }
});

test('search trims and defaults while rejecting ambiguous numeric parameters', () => {
  assert.deepEqual(searchQuerySchema.parse({ q: ' book ' }), { q: 'book', page: 1 });
  assert.equal(searchQuerySchema.safeParse({ q: 'a'.repeat(200), page: '1000' }).success, true);
  for (const value of [ { q: '' }, { q: ' ' }, { q: 'a'.repeat(201) }, { q: ['a','b'] }, ...['0','1001','1.5','1x','01','-1'].map(page => ({ q: 'a', page })) ]) {
    assert.equal(searchQuerySchema.safeParse(value).success, false, JSON.stringify(value));
  }
});

test('book IDs must be canonical positive safe integers', () => {
  assert.equal(bookIdSchema.parse('1'), 1);
  for (const value of ['0', '01', '-1', '1x', '1.5', '9007199254740992', ['1'], undefined]) {
    assert.equal(bookIdSchema.safeParse(value).success, false);
  }
});
