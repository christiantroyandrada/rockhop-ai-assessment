import { useEffect, useRef, useState } from 'react';
import { savedBookSchema, savedBooksSchema } from '../../shared/books.ts';
import type { Book, SavedBook, UpdateBook } from '../../shared/books.ts';
import { request, removeBook, errorMessage } from './api.ts';
import { SavedBooks } from './SavedBooks.tsx';
import { BookSearch } from './BookSearch.tsx';

export function ReadingList() {
  const [view, setView] = useState<'saved' | 'discover'>('saved');
  const [books, setBooks] = useState<SavedBook[]>([]);
  const [listLoading, setListLoading] = useState(true);
  // Wait for the initial snapshot before allowing writes that it could overwrite.
  const [listReady, setListReady] = useState(false);
  const [listError, setListError] = useState('');
  const [reload, setReload] = useState(0);
  const [mutationErrors, setMutationErrors] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState(new Set<string>());
  const pending = useRef(new Set<string>());

  useEffect(() => {
    document.title = `${view === 'saved' ? 'Saved books' : 'Discover books'} | Reading List`;
  }, [view]);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true);
    setListError('');
    setListReady(false);
    void request('/api/books', savedBooksSchema, { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) {
          setBooks(items);
          setListReady(true);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const savedIds = new Set(books.map((book) => book.workId));
  async function mutate(workId: string, action: () => Promise<void>) {
    // A ref blocks duplicate clicks immediately, before React renders disabled buttons.
    if (pending.current.has(workId)) return;
    pending.current.add(workId);
    setBusy(new Set(pending.current));
    setMutationErrors((previous) => ({ ...previous, [workId]: '' }));
    try {
      await action();
    } catch (error) {
      setMutationErrors((previous) => ({
        ...previous,
        [workId]: errorMessage(error),
      }));
      throw error;
    } finally {
      pending.current.delete(workId);
      setBusy(new Set(pending.current));
    }
  }
  const save = (book: Book) =>
    mutate(book.workId, async () => {
      const saved = await request('/api/books', savedBookSchema, {
        method: 'POST',
        body: JSON.stringify(book),
      });
      setBooks((previous) => [saved, ...previous]);
    });
  const update = (book: SavedBook, patch: UpdateBook) =>
    mutate(book.workId, async () => {
      const updated = await request(`/api/books/${book.id}`, savedBookSchema, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setBooks((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
    });
  const remove = (book: SavedBook) =>
    mutate(book.workId, async () => {
      await removeBook(book.id);
      setBooks((previous) => previous.filter((item) => item.id !== book.id));
    });

  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to books
      </a>
      <header className="masthead">
        <a href="/" className="wordmark">
          Reading list
          <span className="wordmark-dot" aria-hidden="true">
            .
          </span>
        </a>
        <span className="masthead-note">One book at a time</span>
      </header>
      <main>
        <div className="intro">
          <h1>Keep your next chapter close.</h1>
          <p>Discover something worth reading. Keep a little note for later.</p>
        </div>
        <div
          className="view-switcher"
          role="tablist"
          aria-label="Book workspace"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 'saved'
                : event.key === 'End'
                  ? 'discover'
                  : view === 'saved'
                    ? 'discover'
                    : 'saved';
            setView(next);
            document.getElementById(`${next}-tab`)?.focus();
          }}
        >
          <button
            id="saved-tab"
            role="tab"
            aria-selected={view === 'saved'}
            aria-controls="saved-panel"
            tabIndex={view === 'saved' ? 0 : -1}
            onClick={() => setView('saved')}
          >
            Saved books <span className="count">({books.length})</span>
          </button>
          <button
            id="discover-tab"
            role="tab"
            aria-selected={view === 'discover'}
            aria-controls="discover-panel"
            tabIndex={view === 'discover' ? 0 : -1}
            onClick={() => setView('discover')}
          >
            Discover books
          </button>
        </div>
        <div className="workspace" id="workspace" tabIndex={-1}>
          {/* Keep both panels mounted so switching tasks preserves searches and drafts. */}
          <div
            id="saved-panel"
            role="tabpanel"
            aria-labelledby="saved-tab"
            hidden={view !== 'saved'}
            tabIndex={0}
          >
            <SavedBooks
              books={books}
              loading={listLoading}
              ready={listReady}
              error={listError}
              busy={busy}
              errors={mutationErrors}
              onRetry={() => setReload((previous) => previous + 1)}
              onUpdate={update}
              onRemove={remove}
              onDiscover={() => {
                setView('discover');
                document.getElementById('discover-tab')?.focus();
              }}
            />
          </div>
          <div
            id="discover-panel"
            role="tabpanel"
            aria-labelledby="discover-tab"
            hidden={view !== 'discover'}
            tabIndex={0}
          >
            <BookSearch
              listReady={listReady}
              savedIds={savedIds}
              busy={busy}
              errors={mutationErrors}
              onSave={save}
            />
          </div>
        </div>
      </main>
      <footer>
        Book discovery powered by Open Library.
        <span>Your reading list stays on this device.</span>
      </footer>
    </>
  );
}
