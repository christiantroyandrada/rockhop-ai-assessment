import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createApp } from './app.ts';
import { createStore } from './books/store.ts';
import { createBookSearch } from './books/open-library.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = z
  .object({
    PORT: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .pipe(z.number().int().max(65535))
      .default(3001),
    DATABASE_PATH: z.string().trim().min(1).default('data/reading-list.sqlite'),
  })
  .safeParse(process.env);
if (!config.success) {
  console.error(
    JSON.stringify({
      event: 'invalid_configuration',
      fields: config.error.issues.map((issue) => issue.path.join('.')),
    }),
  );
  process.exit(1);
}
const databasePath = resolve(root, config.data.DATABASE_PATH);
mkdirSync(dirname(databasePath), { recursive: true });
const store = createStore(databasePath);
const app = createApp({
  store,
  search: createBookSearch(),
  staticDir: resolve(root, 'dist'),
});
const server = app.listen(config.data.PORT, '127.0.0.1', () =>
  console.log(
    JSON.stringify({
      event: 'listening',
      url: `http://127.0.0.1:${config.data.PORT}`,
    }),
  ),
);
server.on('error', (error) => {
  console.error(
    JSON.stringify({ event: 'server_failed', error: error.message }),
  );
  store.close();
  process.exit(1);
});
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_timeout' }));
    process.exit(1);
  }, 10000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
