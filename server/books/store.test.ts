import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { createStore, DuplicateBookError } from './store.ts';

const book = { workId: '/works/OL1W', title: 'A', authors: ['Ada'], firstPublishYear: 2020 };

test('saved edits survive reopen; duplicate and missing operations preserve integrity', t => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  let store = createStore(path);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const created = store.add(book);
  assert.equal(created.status, 'want_to_read');
  assert.equal(created.notes, '');
  assert.throws(() => store.add(book), DuplicateBookError);
  const literal = "'); DROP TABLE saved_books; --";
  assert.equal(store.update(created.id, { notes: literal, status: 'finished' })?.notes, literal);
  store.close();
  store = createStore(path);
  assert.equal(store.list()[0]?.notes, literal);
  assert.equal(store.list()[0]?.status, 'finished');
  assert.equal(store.update(999, { notes: 'missing' }), null);
  assert.equal(store.remove(created.id), true);
  assert.equal(store.remove(created.id), false);
  assert.deepEqual(store.list(), []);
});

test('database rejects invalid writes atomically and lists deterministically', t => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  const store = createStore(path);
  const direct = new DatabaseSync(path);
  t.after(() => { direct.close(); store.close(); rmSync(dir, { recursive: true, force: true }); });
  const first = store.add(book);
  const second = store.add({ ...book, workId: '/works/OL2W' });
  assert.deepEqual(store.list().map(item => item.id), [second.id, first.id]);
  assert.throws(() => direct.prepare("UPDATE saved_books SET status='invalid', notes='lost' WHERE id=?").run(first.id));
  assert.throws(() => direct.prepare('UPDATE saved_books SET notes=? WHERE id=?').run('a'.repeat(2001), first.id));
  assert.equal(store.list().find(item => item.id === first.id)?.notes, '');
  assert.equal(store.list().find(item => item.id === first.id)?.status, 'want_to_read');
  assert.equal(direct.prepare('PRAGMA journal_mode').get()?.journal_mode, 'wal');
  assert.equal(direct.prepare('PRAGMA synchronous').get()?.synchronous, 2);
});
