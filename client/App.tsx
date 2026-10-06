import { useEffect, useRef, useState } from 'react';
import { savedBookSchema, savedBooksSchema, searchResponseSchema } from '../shared/books.ts';
import type { Book, SavedBook, SearchResponse } from '../shared/books.ts';
import { request, removeBook, errorMessage } from './api.ts';
import { SavedBookCard } from './SavedBookCard.tsx';

export function App() {
  const [books, setBooks] = useState<SavedBook[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listReady, setListReady] = useState(false);
  const [listError, setListError] = useState('');
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mutationErrors, setMutationErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(new Set<string>());
  const pending = useRef(new Set<string>());
  const searchController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true); setListError(''); setListReady(false);
    void request('/api/books', savedBooksSchema, { signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) { setBooks(items); setListReady(true); }
    }).catch(error => { if (!controller.signal.aborted) setListError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => searchController.current?.abort(), []);

  const savedIds = new Set(books.map(book => book.workId));
  async function search(q: string, page: number) {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearchError(''); setSearchedQuery(q.trim()); setSearchLoading(true); setResult(null);
    try {
      if (!q.trim()) throw new Error('Enter a title, author, or keyword.');
      const data = await request(`/api/search?${new URLSearchParams({ q: q.trim(), page: String(page) })}`, searchResponseSchema, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(data);
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }
  async function mutate(workId: string, action: () => Promise<void>) {
    if (pending.current.has(workId)) return;
    pending.current.add(workId); setBusy(new Set(pending.current));
    setMutationErrors(previous => ({ ...previous, [workId]: '' }));
    try { await action(); }
    catch (error) { setMutationErrors(previous => ({ ...previous, [workId]: errorMessage(error) })); throw error; }
    finally { pending.current.delete(workId); setBusy(new Set(pending.current)); }
  }
  const save = (book: Book) => mutate(book.workId, async () => {
    const saved = await request('/api/books', savedBookSchema, { method: 'POST', body: JSON.stringify(book) });
    setBooks(previous => [saved, ...previous]);
  });

  return <>
    <a className="skip-link" href="#search">Skip to search</a>
    <header className="masthead"><a href="/" className="wordmark">Reading list<span className="wordmark-dot" aria-hidden="true">.</span></a><span className="masthead-note">One book at a time</span></header>
    <main>
      <div className="intro"><p className="eyebrow">Your next chapter</p><h1>A place for books<br />you want to return to.</h1><p>Discover something worth reading. Keep a little note for later.</p></div>
      <div className="workspace">
        <section id="search" className="discovery" aria-labelledby="search-heading">
          <div className="section-heading"><h2 id="search-heading">Find a book</h2><span className="eyebrow">Open Library</span></div>
          <form className="search-form" onSubmit={event => { event.preventDefault(); void search(query, 1); }}>
            <label htmlFor="query">Title, author, or keyword</label>
            <div className="search-controls"><input id="query" type="search" maxLength={200} required value={query} onChange={event => setQuery(event.target.value)} placeholder="Try The Hobbit or Ursula Le Guin" /><button type="submit">Search</button></div>
          </form>
          <div aria-live="polite" className="search-status">{searchLoading ? 'Searching the shelves…' : result ? `${result.total.toLocaleString()} results for “${searchedQuery}”` : 'Search millions of books, then save a few that speak to you.'}</div>
          {searchError && <p className="error" role="alert">{searchError}</p>}
          {result && result.results.length === 0 && <div className="empty"><h3>No books found.</h3><p>Try a different title, author, or a shorter keyword.</p></div>}
          {result && <ul className="search-results">{result.results.map(book => <li key={book.workId}>
            <div className="result-copy"><h3>{book.title}</h3><p className="metadata">{book.authors.join(', ') || 'Author unknown'}<span className="separator"> · </span>{book.firstPublishYear ?? 'Year unknown'}</p></div>
            <button className="secondary" disabled={!listReady || busy.has(book.workId) || savedIds.has(book.workId)} onClick={() => { void save(book).catch(() => {}); }}>{savedIds.has(book.workId) ? 'Saved' : busy.has(book.workId) ? 'Saving…' : 'Save book'}</button>
            {mutationErrors[book.workId] && <p className="error" role="alert">{mutationErrors[book.workId]}</p>}
          </li>)}</ul>}
          {result && result.total > 0 && <nav className="pagination" aria-label="Search pages"><button className="secondary" disabled={searchLoading || result.page === 1} onClick={() => { void search(searchedQuery,result.page-1); }}>Previous</button><span>Page {result.page} of {Math.min(1000,Math.ceil(result.total/result.pageSize)).toLocaleString()}</span><button className="secondary" disabled={searchLoading || result.page >= 1000 || result.page*result.pageSize >= result.total} onClick={() => { void search(searchedQuery,result.page+1); }}>Next</button></nav>}
        </section>
        <section className="collection" aria-labelledby="list-heading">
          <div className="section-heading"><h2 id="list-heading">On your list</h2><span className="count">{books.length}</span></div>
          {listLoading && <p role="status">Loading your reading list…</p>}
          {listError && <div className="error" role="alert"><p>{listError}</p><button className="secondary" onClick={() => setReload(previous => previous+1)}>Retry loading list</button></div>}
          {listReady && books.length === 0 && <div className="empty"><span className="empty-mark" aria-hidden="true">↳</span><h3>Make room for a good book.</h3><p>Save a search result to begin your list. Add a note, and come back when you’re ready.</p></div>}
          {books.map(book => <SavedBookCard key={book.id} book={book} busy={busy.has(book.workId)} error={mutationErrors[book.workId]}
            onUpdate={patch => mutate(book.workId,async () => {
              const updated = await request(`/api/books/${book.id}`,savedBookSchema,{method:'PATCH',body:JSON.stringify(patch)});
              setBooks(previous => previous.map(item => item.id === updated.id ? updated : item));
            })}
            onRemove={() => mutate(book.workId,async () => { await removeBook(book.id); setBooks(previous => previous.filter(item => item.id !== book.id)); })} />)}
        </section>
      </div>
    </main>
    <footer>Book discovery powered by Open Library.<span>Your reading list stays on this device.</span></footer>
  </>;
}
