import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { createStore, DuplicateBookError } from './store.ts';

const book = {
  workId: '/works/OL1W',
  title: 'A',
  authors: ['Ada'],
  firstPublishYear: 2020,
};

test('saved edits survive reopen; duplicate and missing operations preserve integrity', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  let store = createStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const created = store.add(book);
  assert.equal(created.status, 'want_to_read');
  assert.equal(created.notes, '');
  assert.throws(() => store.add(book), DuplicateBookError);
  const literal = "'); DROP TABLE saved_books; --";
  assert.equal(
    store.update(created.id, { notes: literal, status: 'finished' })?.notes,
    literal,
  );
  store.close();
  store = createStore(path);
  assert.equal(store.list()[0]?.notes, literal);
  assert.equal(store.list()[0]?.status, 'finished');
  assert.equal(store.update(999, { notes: 'missing' }), null);
  assert.equal(store.remove(created.id), true);
  assert.equal(store.remove(created.id), false);
  assert.deepEqual(store.list(), []);
});

test('database rejects invalid writes atomically and lists deterministically', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  const store = createStore(path);
  const direct = new DatabaseSync(path);
  t.after(() => {
    direct.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const first = store.add(book);
  const second = store.add({ ...book, workId: '/works/OL2W' });
  assert.deepEqual(
    store.list().map((item) => item.id),
    [second.id, first.id],
  );
  assert.throws(() =>
    direct
      .prepare(
        "UPDATE saved_books SET status='invalid', notes='lost' WHERE id=?",
      )
      .run(first.id),
  );
  assert.throws(() =>
    direct
      .prepare('UPDATE saved_books SET notes=? WHERE id=?')
      .run('a'.repeat(2001), first.id),
  );
  assert.equal(store.list().find((item) => item.id === first.id)?.notes, '');
  assert.equal(
    store.list().find((item) => item.id === first.id)?.status,
    'want_to_read',
  );
  assert.equal(
    direct.prepare('PRAGMA journal_mode').get()?.journal_mode,
    'wal',
  );
  assert.equal(direct.prepare('PRAGMA synchronous').get()?.synchronous, 2);
});

test('a stale ID cannot edit or remove a replacement after deletion and restart', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  let store = createStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const old = store.add(book);
  store.remove(old.id);
  store.close();
  store = createStore(path);
  const replacement = store.add({
    ...book,
    workId: '/works/OL2W',
    title: 'Replacement',
  });
  assert.notEqual(replacement.id, old.id);
  assert.equal(store.update(old.id, { notes: 'Draft from a stale tab' }), null);
  assert.equal(store.remove(old.id), false);
  assert.equal(store.list()[0]?.title, 'Replacement');
  assert.equal(store.list()[0]?.notes, '');
});

test('legacy schema upgrade preserves saved data and reserves new IDs above old IDs', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'reading-list-'));
  const path = join(dir, 'books.sqlite');
  const legacy = new DatabaseSync(path);
  legacy.exec(`CREATE TABLE saved_books (
    id INTEGER PRIMARY KEY,work_id TEXT,title TEXT,authors TEXT,first_publish_year INTEGER,
    status TEXT DEFAULT 'want_to_read',notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  ); INSERT INTO saved_books VALUES(1,'/works/OL1W','A','[]',NULL,'reading','keep me','2026-10-06T00:00:00.000Z','2026-10-06T00:00:00.000Z');
  INSERT INTO saved_books(id,work_id,title,authors) VALUES(2,'/works/OL2W','Deleted legacy book','[]');
  DELETE FROM saved_books WHERE id=2;`);
  legacy.close();
  const store = createStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  assert.equal(store.list()[0]?.id, 1);
  assert.equal(store.list()[0]?.notes, 'keep me');
  const replacement = store.add({ ...book, workId: '/works/OL2W' });
  assert.notEqual(replacement.id, 2);
  assert.equal(store.update(2, { notes: 'stale deleted ID' }), null);
  assert.equal(store.remove(2), false);
});
