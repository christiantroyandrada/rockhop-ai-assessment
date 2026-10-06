import { useRef, useState } from 'react';
import type { SavedBook, UpdateBook } from '../../shared/books.ts';
import { getSavedPage } from './saved-page.ts';
import { SavedBookRow } from './SavedBookRow.tsx';

export function SavedBooks({
  books,
  loading,
  ready,
  error,
  busy,
  errors,
  onRetry,
  onUpdate,
  onRemove,
  onDiscover,
}: {
  books: readonly SavedBook[];
  loading: boolean;
  ready: boolean;
  error: string;
  busy: ReadonlySet<string>;
  errors: Readonly<Record<string, string>>;
  onRetry: () => void;
  onUpdate: (book: SavedBook, patch: UpdateBook) => Promise<void>;
  onRemove: (book: SavedBook) => Promise<void>;
  onDiscover: () => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const result = getSavedPage(books, query, page);
  if (page !== result.page) setPage(result.page);
  const visibleIds = new Set(result.items.map((book) => book.id));
  const rangeStart = (result.page - 1) * 10 + 1;
  function changePage(next: number) {
    setPage(next);
    heading.current?.focus();
  }

  return (
    <section className="collection" aria-labelledby="list-heading">
      <div className="section-heading">
        <h2 id="list-heading" ref={heading} tabIndex={-1}>
          Saved books
        </h2>
        <span className="count">{books.length} books</span>
      </div>
      {loading && <p role="status">Loading your reading list…</p>}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={onRetry}>
            Retry loading list
          </button>
        </div>
      )}
      {ready && books.length === 0 && (
        <div className="empty">
          <h3>Your next chapter starts here.</h3>
          <p>Discover a book, save it here, and add a note for later.</p>
          <button onClick={onDiscover}>Discover books</button>
        </div>
      )}
      {ready && books.length > 0 && (
        <>
          <div className="saved-filter">
            <label htmlFor="saved-query">Search saved books</label>
            <div className="search-controls">
              <input
                id="saved-query"
                type="search"
                maxLength={200}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Filter by title or author"
              />
              {query && (
                <button
                  className="secondary"
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                    document.getElementById('saved-query')?.focus();
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <p className="collection-hint" role="status">
            {result.total === 0
              ? 'No saved books match your search. Try another title or author.'
              : `${rangeStart}–${Math.min(result.page * 10, result.total)} of ${result.total} books${query.trim() ? ' matching your search' : ''}. Open a book to edit status and notes.`}
          </p>
        </>
      )}
      {/* ponytail: keep rows mounted to retain drafts; lift drafts and render pages if lists reach thousands. */}
      {books.map((book) => (
        <div key={book.id} hidden={!visibleIds.has(book.id)}>
          <SavedBookRow
            book={book}
            busy={busy.has(book.workId)}
            error={errors[book.workId]}
            onUpdate={(patch) => onUpdate(book, patch)}
            onRemove={() => onRemove(book)}
          />
        </div>
      ))}
      {ready && result.pageCount > 1 && (
        <nav className="pagination" aria-label="Saved book pages">
          <button
            className="secondary"
            disabled={result.page === 1}
            onClick={() => changePage(result.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.pageCount}
          </span>
          <button
            className="secondary"
            disabled={result.page === result.pageCount}
            onClick={() => changePage(result.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
