import { DatabaseSync } from 'node:sqlite';
import type { SQLOutputValue } from 'node:sqlite';
import { savedBookSchema } from '../../shared/books.ts';
import type { Book, UpdateBook } from '../../shared/books.ts';

export class DuplicateBookError extends Error {}

const toBook = (row: Record<string, SQLOutputValue>) =>
  savedBookSchema.parse({
    id: row.id,
    workId: row.work_id,
    title: row.title,
    authors: typeof row.authors === 'string' ? JSON.parse(row.authors) : null,
    firstPublishYear: row.first_publish_year,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export function createStore(path: string) {
  // ponytail: synchronous local SQLite; use async storage when concurrent load warrants it.
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=FULL;
    PRAGMA busy_timeout=5000;
  `);
  const schema = `
    CREATE TABLE IF NOT EXISTS saved_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id TEXT NOT NULL UNIQUE CHECK(work_id GLOB '/works/OL[0-9]*W' AND substr(work_id,10,length(work_id)-10) NOT GLOB '*[^0-9]*'),
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 300),
      authors TEXT NOT NULL CHECK(json_valid(authors) AND json_type(authors)='array' AND json_array_length(authors)<=20),
      first_publish_year INTEGER CHECK(first_publish_year BETWEEN 0 AND 9999),
      status TEXT NOT NULL DEFAULT 'want_to_read' CHECK(status IN ('want_to_read','reading','finished')),
      notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ) STRICT;
  `;
  const existing = db
    .prepare(
      "SELECT sql FROM sqlite_schema WHERE type='table' AND name='saved_books'",
    )
    .get()?.sql;
  if (typeof existing === 'string' && !existing.includes('AUTOINCREMENT')) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('ALTER TABLE saved_books RENAME TO saved_books_legacy');
      db.exec(schema);
      db.exec(`INSERT INTO saved_books(id,work_id,title,authors,first_publish_year,status,notes,created_at,updated_at)
        SELECT id,work_id,title,authors,first_publish_year,status,notes,created_at,updated_at FROM saved_books_legacy;
        DROP TABLE saved_books_legacy;`);
      // Legacy files have no deleted-ID history; reserve a timestamp floor in this one-time upgrade.
      const floor = Date.now();
      db.prepare(
        "UPDATE sqlite_sequence SET seq=MAX(seq,?) WHERE name='saved_books'",
      ).run(floor);
      db.prepare(
        "INSERT INTO sqlite_sequence(name,seq) SELECT 'saved_books',? WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name='saved_books')",
      ).run(floor);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  } else db.exec(schema);
  const list = db.prepare(
    'SELECT * FROM saved_books ORDER BY created_at DESC, id DESC',
  );
  const add = db.prepare(
    'INSERT INTO saved_books(work_id,title,authors,first_publish_year) VALUES(?,?,?,?) RETURNING *',
  );
  const update =
    db.prepare(`UPDATE saved_books SET status=COALESCE(?,status), notes=COALESCE(?,notes),
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? RETURNING *`);
  const remove = db.prepare('DELETE FROM saved_books WHERE id=?');
  return {
    list: () => list.all().map(toBook),
    add(book: Book) {
      try {
        const row = add.get(
          book.workId,
          book.title,
          JSON.stringify(book.authors),
          book.firstPublishYear,
        );
        if (!row) throw new Error('Insert returned no book');
        return toBook(row);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes(
            'UNIQUE constraint failed: saved_books.work_id',
          )
        ) {
          throw new DuplicateBookError('This book is already saved');
        }
        throw error;
      }
    },
    update(id: number, patch: UpdateBook) {
      const row = update.get(patch.status ?? null, patch.notes ?? null, id);
      return row ? toBook(row) : null;
    },
    remove: (id: number) => Number(remove.run(id).changes) > 0,
    close: () => db.close(),
  };
}
export type BookStore = ReturnType<typeof createStore>;
