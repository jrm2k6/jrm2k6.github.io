// Local stand-in for `wrangler dev`, no dependencies.
//   ADMIN_TOKEN=some-local-token node dev-server.mjs
// Serves the worker on http://localhost:8787 with an in-memory KV.
import http from 'node:http';
import worker from './src/index.js';

const store = new Map();
const env = {
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  ALLOWED_ORIGINS: 'http://localhost:4000,http://127.0.0.1:4000',
  LOCATION: {
    async get(k, type) { const v = store.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
  },
};
if (!env.ADMIN_TOKEN) console.warn('ADMIN_TOKEN is not set: PUT requests will be rejected.');

const port = Number(process.env.PORT) || 8787;
http.createServer(async (inc, out) => {
  const chunks = [];
  for await (const c of inc) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const req = new Request(`http://localhost:${port}${inc.url}`, { method: inc.method, headers: inc.headers, body: ['GET', 'HEAD'].includes(inc.method) ? undefined : body });
  const res = await worker.fetch(req, env);
  out.writeHead(res.status, Object.fromEntries(res.headers));
  out.end(Buffer.from(await res.arrayBuffer()));
  console.log(inc.method, inc.url, res.status);
}).listen(port, () => console.log(`location-api dev server on http://localhost:${port}/location`));
