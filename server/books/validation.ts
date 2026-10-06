import type { z } from 'zod';

export class InputError extends Error {}
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new InputError('Invalid input. Check the fields and try again.');
  return parsed.data;
}
