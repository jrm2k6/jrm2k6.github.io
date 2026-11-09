import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { DEFAULT_LOCATION } from '../src/index.js';

const memKV = () => {
  const m = new Map();
  return {
    async get(k, type) { const v = m.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); },
  };
};

const CHAMONIX = { name: 'Chamonix', latitude: 45.9237, longitude: 6.8694, elevation: 1035, population: 8906, country_code: 'FR', country: 'France', admin1: 'Auvergne-Rhône-Alpes' };
const BUFFALO = { name: 'Buffalo', latitude: 42.88645, longitude: -78.87837, elevation: 183, population: 278349, country_code: 'US', country: 'United States', admin1: 'New York' };
const BUFFALO_MN = { name: 'Buffalo', latitude: 45.17, longitude: -93.87, elevation: 290, population: 15453, country_code: 'US', country: 'United States', admin1: 'Minnesota' };

let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url, init) => {
    url = String(url); calls.push({ url, init });
    const u = new URL(url);
    if (u.host === 'geocoding-api.open-meteo.com') {
      const name = u.searchParams.get('name').toLowerCase();
      const results = name.startsWith('chamonix') ? [CHAMONIX] : name === 'buffalo' ? [BUFFALO_MN, BUFFALO] : [];
      return Response.json(results.length ? { results } : {});
    }
    if (u.host === 'nominatim.openstreetmap.org') return Response.json({ address: { city: 'Buffalo', state: 'New York', country: 'United States', country_code: 'us' } });
    return new Response('unexpected ' + url, { status: 500 });
  };
});

const env = () => ({ LOCATION: memKV(), JEREMY_DAGORN_ADMIN_TOKEN: 'test-token-123', ALLOWED_ORIGINS: 'https://jeremydagorn.com,http://localhost:4000' });
const req = (method, body, headers = {}) => new Request('https://api.test/location', {
  method, headers: { 'Content-Type': 'application/json', ...headers }, body: body == null ? undefined : JSON.stringify(body),
});
const auth = { Authorization: 'Bearer test-token-123' };

test('GET returns the default location before anything is set', async () => {
  const res = await worker.fetch(req('GET'), env());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), DEFAULT_LOCATION);
});

test('PUT without the right token is rejected and stores nothing', async () => {
  const e = env();
  for (const headers of [{}, { Authorization: 'Bearer nope' }, { Authorization: 'Bearer test-token-1234' }]) {
    const res = await worker.fetch(req('PUT', { query: 'Chamonix' }, headers), e);
    assert.equal(res.status, 401);
  }
  assert.equal(await e.LOCATION.get('current'), null);
  assert.equal(calls.length, 0, 'no upstream lookups for unauthenticated requests');
});

test('PUT with no JEREMY_DAGORN_ADMIN_TOKEN configured is always rejected', async () => {
  const e = { ...env(), JEREMY_DAGORN_ADMIN_TOKEN: undefined };
  const res = await worker.fetch(req('PUT', { query: 'Chamonix' }, { Authorization: 'Bearer undefined' }), e);
  assert.equal(res.status, 401);
});

test('PUT {query} geocodes, rounds coordinates, and GET returns it', async () => {
  const e = env();
  const res = await worker.fetch(req('PUT', { query: 'Chamonix' }, auth), e);
  assert.equal(res.status, 200);
  const loc = await res.json();
  assert.equal(loc.city, 'Chamonix, France');
  assert.equal(loc.lat, 45.92); assert.equal(loc.lon, 6.87);
  assert.equal(loc.elevation, 1035); assert.equal(loc.population, 8906);
  assert.equal(loc.scene, null);
  const got = await (await worker.fetch(req('GET'), e)).json();
  assert.equal(got.city, 'Chamonix, France');
});

test('PUT {lat,lon} reverse-geocodes and picks the nearest same-named place', async () => {
  const e = env();
  const res = await worker.fetch(req('PUT', { lat: 42.8812345, lon: -78.8765432 }, auth), e);
  assert.equal(res.status, 200);
  const loc = await res.json();
  assert.equal(loc.city, 'Buffalo, NY');
  assert.equal(loc.population, 278349, 'Buffalo NY, not Buffalo MN');
  const nomi = calls.find(c => c.url.includes('nominatim'));
  assert.ok(nomi.init.headers['User-Agent'].includes('jeremydagorn.com'));
  assert.ok(nomi.url.includes('lat=42.88') && nomi.url.includes('lon=-78.88'), 'coordinates are coarsened before leaving the worker');
});

test('scene override is validated', async () => {
  const e = env();
  let res = await worker.fetch(req('PUT', { query: 'Chamonix', scene: 'atlantis' }, auth), e);
  assert.equal(res.status, 400);
  res = await worker.fetch(req('PUT', { query: 'Chamonix', scene: 'sandiego' }, auth), e);
  assert.equal((await res.json()).scene, 'sandiego');
  res = await worker.fetch(req('PUT', { query: 'Chamonix', scene: 'auto' }, auth), e);
  assert.equal((await res.json()).scene, null);
});

test('unknown place and bad bodies give clear errors', async () => {
  const e = env();
  let res = await worker.fetch(req('PUT', { query: 'Nowhereville' }, auth), e);
  assert.equal(res.status, 404);
  res = await worker.fetch(req('PUT', { lat: 200, lon: 0 }, auth), e);
  assert.equal(res.status, 400);
  res = await worker.fetch(new Request('https://api.test/location', { method: 'PUT', headers: auth, body: 'not json' }), e);
  assert.equal(res.status, 400);
});

test('CORS only echoes allowed origins', async () => {
  const e = env();
  let res = await worker.fetch(req('OPTIONS', null, { Origin: 'http://localhost:4000' }), e);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4000');
  res = await worker.fetch(req('GET', null, { Origin: 'https://evil.example' }), e);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('other paths and methods', async () => {
  const e = env();
  assert.equal((await worker.fetch(new Request('https://api.test/'), e)).status, 404);
  assert.equal((await worker.fetch(req('DELETE', null, auth), e)).status, 405);
});
