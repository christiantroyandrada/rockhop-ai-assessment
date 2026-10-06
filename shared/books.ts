import { z } from 'zod';

export const readingStatuses = ['want_to_read', 'reading', 'finished'] as const;
export const statusLabels = {
  want_to_read: 'Want to read',
  reading: 'Reading',
  finished: 'Finished',
};
const nonblank = (max: number) => z.string().trim().min(1).max(max);
const positiveDecimal = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export const bookIdSchema = positiveDecimal;
export const bookSchema = z
  .object({
    workId: z.string().regex(/^\/works\/OL\d+W$/),
    title: nonblank(300),
    authors: z.array(nonblank(200)).max(20),
    firstPublishYear: z.number().int().min(0).max(9999).nullable(),
  })
  .strict();
export const updateBookSchema = z
  .object({
    status: z.enum(readingStatuses).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict()
  .refine((value) => value.status !== undefined || value.notes !== undefined);
export const savedBookSchema = bookSchema.extend({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  status: z.enum(readingStatuses),
  notes: z.string().max(2000),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const savedBooksSchema = z.array(savedBookSchema);
export const searchQuerySchema = z
  .object({
    q: nonblank(200),
    page: positiveDecimal.pipe(z.number().max(1000)).default(1),
  })
  .strict();
export const searchResponseSchema = z.object({
  results: z.array(bookSchema).max(12),
  page: z.number().int().min(1).max(1000),
  pageSize: z.literal(12),
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export const errorSchema = z.object({ error: z.string() });
export type Book = z.infer<typeof bookSchema>;
export type SavedBook = z.infer<typeof savedBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type ReadingStatus = SavedBook['status'];
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
