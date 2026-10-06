import { useEffect, useRef, useState } from 'react';
import { savedBookSchema, savedBooksSchema } from '../../shared/books.ts';
import type { Book, SavedBook } from '../../shared/books.ts';
import { request, removeBook, errorMessage } from './api.ts';
import { SavedBookRow } from './SavedBookRow.tsx';
import { BookSearch } from './BookSearch.tsx';

export function ReadingList() {
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

  return (
    <>
      <a className="skip-link" href="#search">
        Skip to search
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
          <p className="eyebrow">Your next chapter</p>
          <h1>
            A place for books
            <br />
            you want to return to.
          </h1>
          <p>Discover something worth reading. Keep a little note for later.</p>
        </div>
        <div className="workspace">
          <BookSearch
            listReady={listReady}
            savedIds={savedIds}
            busy={busy}
            errors={mutationErrors}
            onSave={save}
          />
          <section className="collection" aria-labelledby="list-heading">
            <div className="section-heading">
              <h2 id="list-heading">On your list</h2>
              <span className="count">{books.length}</span>
            </div>
            {listReady && books.length > 0 && (
              <p className="collection-hint">
                Open a book to edit status and notes.
              </p>
            )}
            {listLoading && <p role="status">Loading your reading list…</p>}
            {listError && (
              <div className="error" role="alert">
                <p>{listError}</p>
                <button
                  className="secondary"
                  onClick={() => setReload((previous) => previous + 1)}
                >
                  Retry loading list
                </button>
              </div>
            )}
            {listReady && books.length === 0 && (
              <div className="empty">
                <span className="empty-mark" aria-hidden="true">
                  ↳
                </span>
                <h3>Make room for a good book.</h3>
                <p>
                  Save a search result to begin your list. Add a note, and come
                  back when you’re ready.
                </p>
              </div>
            )}
            {books.map((book) => (
              <SavedBookRow
                key={book.id}
                book={book}
                busy={busy.has(book.workId)}
                error={mutationErrors[book.workId]}
                onUpdate={(patch) =>
                  mutate(book.workId, async () => {
                    const updated = await request(
                      `/api/books/${book.id}`,
                      savedBookSchema,
                      { method: 'PATCH', body: JSON.stringify(patch) },
                    );
                    setBooks((previous) =>
                      previous.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    );
                  })
                }
                onRemove={() =>
                  mutate(book.workId, async () => {
                    await removeBook(book.id);
                    setBooks((previous) =>
                      previous.filter((item) => item.id !== book.id),
                    );
                  })
                }
              />
            ))}
          </section>
        </div>
      </main>
      <footer>
        Book discovery powered by Open Library.
        <span>Your reading list stays on this device.</span>
      </footer>
    </>
  );
}
