import { useEffect, useRef, useState } from 'react';
import { searchResponseSchema } from '../../shared/books.ts';
import type { Book, SearchResponse } from '../../shared/books.ts';
import { request, errorMessage } from './api.ts';

export function BookSearch({
  listReady,
  savedIds,
  busy,
  errors,
  onSave,
}: {
  listReady: boolean;
  savedIds: ReadonlySet<string>;
  busy: ReadonlySet<string>;
  errors: Readonly<Record<string, string>>;
  onSave: (book: Book) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchController = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => searchController.current?.abort(), []);

  async function search(q: string, page: number) {
    // Superseded searches cannot replace the latest results or loading state.
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearchError('');
    setSearchedQuery(q.trim());
    setSearchLoading(true);
    setResult(null);
    try {
      if (!q.trim()) throw new Error('Enter a title, author, or keyword.');
      const data = await request(
        `/api/search?${new URLSearchParams({ q: q.trim(), page: String(page) })}`,
        searchResponseSchema,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setResult(data);
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }
  function changePage(page: number) {
    void search(searchedQuery, page);
    heading.current?.focus();
  }

  return (
    <section id="search" className="discovery" aria-labelledby="search-heading">
      <div className="section-heading">
        <h2 id="search-heading" ref={heading} tabIndex={-1}>
          Find a book
        </h2>
        <span className="eyebrow">Open Library</span>
      </div>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query, 1);
        }}
      >
        <label htmlFor="query">Title, author, or keyword</label>
        <div className="search-controls">
          <input
            id="query"
            type="search"
            maxLength={200}
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try The Hobbit or Ursula Le Guin"
          />
          <button type="submit">Search</button>
        </div>
      </form>
      {!listReady && (
        <p className="collection-hint">
          Saving is available once your list loads. Check Saved books if loading
          fails.
        </p>
      )}
      <div aria-live="polite" className="search-status">
        {searchLoading
          ? 'Searching the shelves…'
          : result
            ? `${result.total.toLocaleString()} results for “${searchedQuery}”`
            : 'Search millions of books, then save a few that speak to you.'}
      </div>
      {searchError && (
        <p className="error" role="alert">
          {searchError}
        </p>
      )}
      {result && result.results.length === 0 && (
        <div className="empty">
          <h3>No books found.</h3>
          <p>Try a different title, author, or a shorter keyword.</p>
        </div>
      )}
      {result && (
        <ul className="search-results">
          {result.results.map((book) => (
            <li key={book.workId}>
              <div className="result-copy">
                <h3>{book.title}</h3>
                <p className="metadata">
                  {book.authors.join(', ') || 'Author unknown'}
                  <span className="separator"> · </span>
                  {book.firstPublishYear ?? 'Year unknown'}
                </p>
              </div>
              <button
                className="secondary"
                disabled={
                  !listReady ||
                  busy.has(book.workId) ||
                  savedIds.has(book.workId)
                }
                onClick={() => {
                  void onSave(book).catch(() => {});
                }}
              >
                {savedIds.has(book.workId)
                  ? 'Saved'
                  : busy.has(book.workId)
                    ? 'Saving…'
                    : 'Save book'}
              </button>
              {errors[book.workId] && (
                <p className="error" role="alert">
                  {errors[book.workId]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {result && result.total > result.pageSize && (
        <nav className="pagination" aria-label="Search pages">
          <button
            className="secondary"
            disabled={searchLoading || result.page === 1}
            onClick={() => changePage(result.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {result.page} of{' '}
            {Math.min(
              1000,
              Math.ceil(result.total / result.pageSize),
            ).toLocaleString()}
          </span>
          <button
            className="secondary"
            disabled={
              searchLoading ||
              result.page >= 1000 ||
              result.page * result.pageSize >= result.total
            }
            onClick={() => changePage(result.page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
