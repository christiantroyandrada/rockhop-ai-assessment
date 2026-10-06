import { useState } from 'react';
import { readingStatuses, statusLabels } from '../shared/books.ts';
import type { SavedBook, UpdateBook } from '../shared/books.ts';

export function SavedBookCard({
  book,
  busy,
  error,
  onUpdate,
  onRemove,
}: {
  book: SavedBook;
  busy: boolean;
  error?: string;
  onUpdate: (patch: UpdateBook) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  // Keep drafts until a successful save; a failed request must not discard edits.
  const [status, setStatus] = useState(book.status);
  const [notes, setNotes] = useState(book.notes);
  const changed = status !== book.status || notes !== book.notes;
  return (
    <article className="saved-book" aria-labelledby={`title-${book.id}`}>
      <details>
        <summary className="book-summary">
          <span className="book-summary-copy">
            <span className="book-title" id={`title-${book.id}`}>
              {book.title}
            </span>
            <span className="metadata">
              {book.authors.join(', ') || 'Author unknown'} ·{' '}
              {book.firstPublishYear ?? 'Year unknown'}
            </span>
            <span className="book-summary-state">
              {statusLabels[book.status]}
              {changed && <span className="unsaved">Unsaved changes</span>}
            </span>
          </span>
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onUpdate({ status, notes }).catch(() => {});
          }}
        >
          <fieldset disabled={busy}>
            <label htmlFor={`status-${book.id}`}>Reading status</label>
            <select
              id={`status-${book.id}`}
              value={status}
              onChange={(event) => {
                const next = readingStatuses.find(
                  (value) => value === event.target.value,
                );
                if (next) setStatus(next);
              }}
            >
              {readingStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
            <label htmlFor={`notes-${book.id}`}>Notes</label>
            <textarea
              id={`notes-${book.id}`}
              maxLength={2000}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="A recommendation, a thought, a favorite line…"
            />
            <div className="book-actions">
              <button type="submit" disabled={!changed}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  void onRemove().catch(() => {});
                }}
              >
                Remove
              </button>
              <span className="draft-status">
                {changed ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
          </fieldset>
        </form>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
