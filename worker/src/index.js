// Location API for the jeremydagorn.com weather backdrop.
//
// GET  /location   public, returns where Jeremy currently is (city level)
// PUT  /location   requires "Authorization: Bearer <ADMIN_TOKEN>"
//   {"query": "Chamonix"}            look a place up by name
//   {"lat": 45.92, "lon": 6.87}      reverse-geocode coordinates (e.g. phone GPS)
//   optional "scene": force one of SCENES, or "auto" / omitted to let the page decide

export const SCENES = ['buffalo', 'sandiego', 'city'];

export const DEFAULT_LOCATION = {
  city: 'Buffalo, NY', name: 'Buffalo', country_code: 'US',
  lat: 42.89, lon: -78.88, elevation: 183, population: 278349, scene: 'buffalo',
};

const USER_AGENT = 'jeremydagorn.com-location-worker/1.0 (+https://jeremydagorn.com)';

function corsHeaders(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

function authorized(req, env) {
  if (!env.ADMIN_TOKEN) return false;
  const got = req.headers.get('Authorization') || '';
  const want = `Bearer ${env.ADMIN_TOKEN}`;
  let diff = got.length ^ want.length;
  for (let i = 0; i < want.length; i++) diff |= (got.charCodeAt(i) || 0) ^ want.charCodeAt(i);
  return diff === 0;
}

const round2 = v => Math.round(v * 100) / 100;
const distKm = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

async function getJSON(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${new URL(url).host} responded ${r.status}`);
  return r.json();
}

async function geocodeByName(name, count = 1) {
  const data = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${count}&language=en&format=json`);
  return data.results || [];
}

function fromHit(hit) {
  const region = hit.country_code === 'US' ? hit.admin1 : hit.country;
  return {
    city: region ? `${hit.name}, ${hit.country_code === 'US' ? usState(hit.admin1) : region}` : hit.name,
    name: hit.name,
    country_code: hit.country_code || null,
    lat: round2(hit.latitude),
    lon: round2(hit.longitude),
    elevation: Number.isFinite(hit.elevation) ? hit.elevation : null,
    population: Number.isFinite(hit.population) ? hit.population : null,
  };
}

async function reverseGeocode(lat, lon) {
  const data = await getJSON(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=en`,
    { headers: { 'User-Agent': USER_AGENT } },
  );
  const a = data.address || {};
  const name = a.city || a.town || a.village || a.municipality || a.hamlet || a.county;
  if (!name) throw new Error('no place found at these coordinates');
  // Match it against Open-Meteo to get population/elevation, preferring the nearest candidate.
  const candidates = await geocodeByName(name, 10);
  const here = { lat, lon };
  const best = candidates
    .map(h => ({ h, d: distKm(here, { lat: h.latitude, lon: h.longitude }) }))
    .filter(c => c.d < 60)
    .sort((x, y) => x.d - y.d)[0];
  if (best) return fromHit(best.h);
  const elev = await getJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`).catch(() => null);
  const cc = (a.country_code || '').toUpperCase() || null;
  return {
    city: cc === 'US' && a.state ? `${name}, ${usState(a.state)}` : a.country ? `${name}, ${a.country}` : name,
    name, country_code: cc, lat: round2(lat), lon: round2(lon),
    elevation: elev?.elevation?.[0] ?? null, population: null,
  };
}

const US = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC' };
const usState = s => US[s] || s;

async function resolve(body) {
  if (typeof body.query === 'string' && body.query.trim()) {
    const [hit] = await geocodeByName(body.query.trim().slice(0, 100));
    if (!hit) return { error: `no place matches "${body.query}"`, status: 404 };
    return { place: fromHit(hit) };
  }
  const lat = Number(body.lat), lon = Number(body.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { place: await reverseGeocode(round2(lat), round2(lon)) };
  }
  return { error: 'send {"query": "City"} or {"lat": .., "lon": ..}', status: 400 };
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname !== '/location') return json({ error: 'not found' }, 404, cors);

    if (req.method === 'GET') {
      const loc = (await env.LOCATION.get('current', 'json')) || DEFAULT_LOCATION;
      return json(loc, 200, { ...cors, 'Cache-Control': 'public, max-age=60' });
    }

    if (req.method === 'PUT') {
      if (!authorized(req, env)) return json({ error: 'unauthorized' }, 401, cors);
      let body;
      try { body = await req.json(); } catch { return json({ error: 'body must be JSON' }, 400, cors); }
      if (!body || typeof body !== 'object') return json({ error: 'body must be a JSON object' }, 400, cors);
      if (body.scene != null && body.scene !== 'auto' && !SCENES.includes(body.scene)) {
        return json({ error: `scene must be "auto" or one of: ${SCENES.join(', ')}` }, 400, cors);
      }
      let result;
      try { result = await resolve(body); } catch (e) { return json({ error: `lookup failed: ${e.message}` }, 502, cors); }
      if (result.error) return json({ error: result.error }, result.status, cors);
      const loc = { ...result.place, scene: SCENES.includes(body.scene) ? body.scene : null, updatedAt: new Date().toISOString() };
      await env.LOCATION.put('current', JSON.stringify(loc));
      return json(loc, 200, cors);
    }

    return json({ error: 'method not allowed' }, 405, { ...cors, Allow: 'GET, PUT, OPTIONS' });
  },
};
