import type { SavedBook } from '../../shared/books.ts';

export function getSavedPage(
  books: readonly SavedBook[],
  query: string,
  page: number,
) {
  const term = query.trim().toLowerCase();
  const matches = books.filter((book) =>
    [book.title, ...book.authors].some((text) =>
      text.toLowerCase().includes(term),
    ),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / 10));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  return {
    items: matches.slice((currentPage - 1) * 10, currentPage * 10),
    total: matches.length,
    page: currentPage,
    pageCount,
  };
}
