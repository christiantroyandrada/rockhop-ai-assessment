import { z } from 'zod';
import { errorSchema } from '../shared/books.ts';

async function response(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  let result: Response;
  try {
    result = await fetch(path, { ...options, headers });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      'Could not connect to the server. Check that it is running and try again.',
      { cause: error },
    );
  }
  if (!result.ok) {
    const data: unknown = await result.json().catch(() => null);
    const error = errorSchema.safeParse(data);
    throw new Error(
      error.success
        ? error.data.error
        : 'The request failed. Please try again.',
    );
  }
  return result;
}
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const result = await response(path, options);
  const data: unknown = await result.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new Error(
      'The server returned an invalid response. Please try again.',
    );
  return parsed.data;
}
export async function removeBook(id: number): Promise<void> {
  await response(`/api/books/${id}`, { method: 'DELETE' });
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The request failed. Please try again.';
