(() => {
  'use strict';

  // ---------- utils ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const toHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hashStr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function ditherAlpha(c, gain = 1) {
    const g = c.getContext('2d'); const img = g.getImageData(0, 0, c.width, c.height); const d = img.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) d[i + 3] = (d[i + 3] / 255) * gain > bayer(p % c.width, (p / c.width) | 0) ? 255 : 0;
    g.putImageData(img, 0, 0); return c;
  }

  // ---------- palettes ----------
  const SKY = {
    clear:  { day: ['#7fb6e3', '#f4e3c6'], night: ['#0c1834', '#33456d'] },
    clouds: { day: ['#9eafc0', '#e1e4e6'], night: ['#182030', '#3b4454'] },
    rain:   { day: ['#7a8b9b', '#c4cbd1'], night: ['#131a26', '#313a48'] },
    snow:   { day: ['#b2c1d0', '#eef1f4'], night: ['#1a2537', '#4a5872'] },
    fog:    { day: ['#c3cacf', '#ebecec'], night: ['#242a32', '#4a5058'] },
    storm:  { day: ['#4a5564', '#97a0aa'], night: ['#0a0e16', '#29303c'] },
  };
  const INK = { day: hex('#27303d'), night: hex('#04060b') };

  // ---------- geometry helpers ----------
  // Landmarks: polygons in "u" units (1u = 1% of max skyline height), centered on x=0, y up from ground.
  // Generators: polygons in px, y up from ground.
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const dome = (cx, y0, r, hm = 1, steps = 10) => {
    const pts = [[cx - r, y0]];
    for (let i = 0; i <= steps; i++) { const a = Math.PI - (i / steps) * Math.PI; pts.push([cx + Math.cos(a) * r, y0 + Math.sin(a) * r * hm]); }
    pts.push([cx + r, y0]); return pts;
  };
  const circle = (cx, cy, r, n = 16) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 6.283) * r, cy + Math.sin(i / n * 6.283) * r]);
  const curve = (x0, x1, f, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const x = lerp(x0, x1, i / n); return [x, f(x)]; });
  function thickLine(pts, w) {
    const A = [], B = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * w / 2, ny = dx / len * w / 2;
      A.push([pts[i][0] + nx, pts[i][1] + ny]); B.push([pts[i][0] - nx, pts[i][1] - ny]);
    }
    return [...A, ...B.reverse()];
  }
  const place = (polys, ox, u, s = 1, oy = 0) => polys.map(p => p.map(([x, y]) => [ox + x * u * s, oy + y * u * s]));

  // ---------- landmarks ----------
  const L = {
    // Buffalo
    cityHall: () => [
      box(-34, 0, 68, 15), box(-22, 0, 44, 30), box(-15, 0, 30, 46), box(-11, 0, 22, 72), box(-9, 0, 18, 80),
      [[-8, 80], [8, 80], [6.5, 88], [4.5, 93], [0, 96.5], [-4.5, 93], [-6.5, 88]], box(-0.6, 95, 1.2, 5),
    ],
    elevator: (n, sw, sh) => {
      const total = n * sw, x0 = -total / 2, P = [];
      for (let i = 0; i < n; i++) P.push(box(x0 + i * sw + 0.35, 0, sw - 0.7, sh));
      P.push(box(x0 + 1, sh, total - 2, 5), box(x0 + total - 3, 0, 12, sh + 22));
      P.push([[x0 + total - 4, sh + 22], [x0 + total + 10, sh + 22], [x0 + total + 3, sh + 27]]);
      P.push(box(x0 + total + 10, 6, 3.2, sh + 14), [[x0 + total + 9, 6], [x0 + total + 14, 6], [x0 + total + 18, 0], [x0 + total + 5, 0]]);
      return P;
    },
    lighthouse: () => [[[-3, 0], [3, 0], [2.2, 20], [-2.2, 20]], box(-3.2, 20, 6.4, 1.4), box(-1.7, 21.4, 3.4, 3.4), [[-2.2, 24.8], [2.2, 24.8], [0, 27.5]]],
    senecaOne: () => [box(-8, 0, 16, 84), box(-6, 84, 12, 2)],
    electricTower: () => [box(-6, 0, 12, 44), box(-4.5, 44, 9, 12), [[-4, 56], [4, 56], [3, 61], [-3, 61]], box(-1.5, 61, 3, 5), box(-0.4, 66, 0.8, 5)],
    liberty: () => [box(-7, 0, 14, 60), box(-5, 60, 10, 6), box(-4, 66, 1.5, 6), box(2.5, 66, 1.5, 6)],
    // San Diego
    coronadoBridge: () => {
      // long sweeping deck on slender piers, rising toward the shipping channel
      const deck = x => 3 + 19 * (1 - (x / 62) ** 2);
      const P = [thickLine(curve(-62, 62, deck, 40), 2.2)];
      for (let x = -56; x <= 56; x += 7) P.push(box(x - 0.9, 0, 1.8, deck(x)));
      return P;
    },
    midway: () => [
      [[-30, 0], [29, 0], [33, 4], [35, 7], [-34, 7], [-32, 3]],          // hull
      box(-36, 7, 72, 1.3),                                               // flight deck
      box(8, 8.3, 6, 6), box(9, 14.3, 3.4, 3), box(10.5, 17.3, 0.4, 7),  // island and mast
      [[-24, 8.3], [-20, 8.3], [-22, 10]], [[-12, 8.3], [-8, 8.3], [-10, 10]], [[22, 8.3], [26, 8.3], [24, 10]], // parked jets
    ],
    oneAmericaPlaza: () => [box(-6.5, 0, 13, 72), [[-6.5, 72], [6.5, 72], [4, 79], [1.4, 86], [-1.4, 86], [-4, 79]], box(-0.3, 86, 0.6, 6)],
    pinnacleTowers: () => [box(-14, 0, 9, 58), box(-13, 58, 7, 3), box(4, 0, 9, 64), box(5, 64, 7, 3)],
    californiaTower: () => [box(-4, 0, 8, 30), box(-3.2, 30, 6.4, 10), box(-2.6, 40, 5.2, 6), dome(0, 46, 2.6, 1.4), box(-0.6, 49.5, 1.2, 2.2), box(-0.2, 51.7, 0.4, 3)],
    hotelDel: () => [box(-26, 0, 52, 12), [[-8, 12], [8, 12], [0, 24]], [[-22, 12], [-15, 12], [-18.5, 18]], [[15, 12], [22, 12], [18.5, 18]], box(-26, 12, 4, 3), box(22, 12, 4, 3)],
  };

  // ---------- generators (px) ----------
  function filler(rng, W, u, o) {
    const polys = [];
    let x = o.x0 ?? -20;
    const end = o.x1 ?? W + 20;
    while (x < end) {
      const w = (o.minW + rng() * (o.maxW - o.minW)) * u;
      const edge = Math.abs((x + w / 2) / W - 0.5) * 2;
      const hf = lerp(o.centerScale ?? 0.6, 1, smooth(0, 1, edge));
      const h = (o.minH + rng() * (o.maxH - o.minH)) * u * hf;
      polys.push(box(x, 0, w, h));
      const r = rng();
      if (r < 0.14) polys.push(box(x + w / 2 - 0.4 * u, h, 0.8 * u, (8 + rng() * 12) * u));
      else if (r < 0.32) { const sw = w * (0.5 + rng() * 0.25); polys.push(box(x + (w - sw) / 2, h, sw, (6 + rng() * 14) * u * hf)); }
      else if (r < 0.42) polys.push([[x, h], [x + w, h], [x + w / 2, h + w * 0.45]]);
      else if (r < 0.54 && w > 8 * u) {
        const tx = x + w * (0.2 + rng() * 0.5);
        polys.push(box(tx, h, 0.6 * u, 3 * u), box(tx + 3.4 * u, h, 0.6 * u, 3 * u), box(tx - 0.3 * u, h + 3 * u, 4.6 * u, 4 * u), [[tx - 0.6 * u, h + 7 * u], [tx + 4.6 * u, h + 7 * u], [tx + 2 * u, h + 8.6 * u]]);
      } else if (r < 0.7) polys.push(box(x + w * 0.15, h, w * 0.3, 2.5 * u));
      x += w + rng() * o.gap * u;
    }
    return polys;
  }

  function ridge(rng, W, base, amp, { x0 = -20, x1 = W + 20, freq = 1, jag = 0 } = {}) {
    const waves = Array.from({ length: 4 }, (_, i) => ({ f: freq * (0.002 + i * 0.0035) * (0.7 + rng() * 0.6), p: rng() * 6.28, w: 1 / (i + 1) }));
    const pts = [[x0, 0]];
    for (let x = x0; x <= x1; x += 8) {
      let y = 0; for (const v of waves) y += Math.sin(x * v.f + v.p) * v.w;
      pts.push([x, Math.max(0, base + amp * y * 0.55 + (rng() - 0.5) * jag)]);
    }
    pts.push([x1, 0]);
    return pts;
  }

  const palm = (x, h) => {
    const lean = h * (0.05 + ((x * 7.13) % 1) * 0.07), top = [x + lean, h];
    const P = [thickLine([[x, 0], [x + lean * 0.3, h * 0.5], top], h * 0.04)];
    // drooping, tapered fronds
    for (const k of [-1, -0.75, -0.45, -0.15, 0.15, 0.45, 0.75, 1]) {
      const len = h * (0.3 - Math.abs(k) * 0.04);
      const end = [top[0] + k * len, top[1] - h * (0.04 + 0.22 * k * k)];
      const mid = [top[0] + k * len * 0.55, top[1] + h * 0.05 * (1 - k * k * 0.6)];
      const dx = end[0] - top[0], dy = end[1] - top[1], n = Math.hypot(dx, dy) || 1, w = h * 0.045;
      const nx = -dy / n * w, ny = dx / n * w;
      P.push([top, [mid[0] + nx, mid[1] + ny], end, [mid[0] - nx * 0.4, mid[1] - ny * 0.4]]);
    }
    P.push(circle(top[0], top[1] - h * 0.01, h * 0.035, 8));
    return P;
  };
  function trees(rng, kind, x0, x1, minH, maxH, spacing, oy = 0) {
    const P = [];
    for (let x = x0; x < x1; x += spacing * (0.5 + rng())) {
      const h = minH + rng() * (maxH - minH);
      P.push(...kind(x, h).map(p => p.map(([a, b]) => [a, b + oy])));
    }
    return P;
  }

  // ---------- scenes ----------
  // Each scene returns layers far/mid/near (+ optional water height, accents, tint).
  const SCENES = {
    buffalo: { label: 'Buffalo, NY', home: [42.8864, -78.8784], build: (W, u, rng) => ({
      far: filler(rng, W, u, { minW: 5, maxW: 12, minH: 14, maxH: 34, gap: 3 }),
      mid: [...filler(rng, W, u, { minW: 6, maxW: 14, minH: 10, maxH: 28, gap: 6 }), ...place(L.elevator(5, 5, 26), W * 0.25, u), ...place(L.senecaOne(), W * 0.73, u), ...place(L.electricTower(), W * 0.92, u), ...place(L.liberty(), W * 0.67, u, 0.95)],
      near: [...filler(rng, W, u, { minW: 7, maxW: 16, minH: 5, maxH: 15, gap: 2, centerScale: 0.8 }), ...place(L.lighthouse(), W * 0.035, u), ...place(L.elevator(8, 6, 36), W * 0.135, u), ...place(L.cityHall(), W * 0.84, u)],
    }) },
    sandiego: { label: 'San Diego, CA', home: [32.7157, -117.1611], tint: [1.06, 1, 0.92], build: (W, u, rng) => ({
      // Point Loma on the left horizon, downtown on the right
      far: [ridge(rng, W, 24 * u, 12 * u, { x0: -20, x1: W * 0.42 }), ...filler(rng, W, u, { minW: 4, maxW: 8, minH: 12, maxH: 30, gap: 2, x0: W * 0.55 })],
      mid: [
        ...place(L.coronadoBridge(), W * 0.2, u, 1.35),
        ...filler(rng, W, u, { minW: 5, maxW: 10, minH: 14, maxH: 44, gap: 1, x0: W * 0.6 }),
        ...place(L.pinnacleTowers(), W * 0.68, u), ...place(L.oneAmericaPlaza(), W * 0.79, u), ...place(L.californiaTower(), W * 0.95, u),
      ],
      water: 8 * u,
      near: [
        ...place(L.midway(), W * 0.1, u, 1.5, 1.5 * u),
        ...place(L.hotelDel(), W * 0.28, u, 0.8, 0),
        box(W * 0.6, 0, W * 0.42, 3 * u),
        ...trees(rng, palm, W * 0.62, W * 0.74, 20 * u, 30 * u, 10 * u, 3 * u),
        ...trees(rng, palm, W * 0.88, W + 10, 22 * u, 34 * u, 10 * u, 3 * u),
        ...trees(rng, palm, W * 0.3, W * 0.36, 14 * u, 20 * u, 9 * u, 0),
      ],
      windows: false,
    }) },
    city: { label: 'Generic city', home: [41.8781, -87.6298], build: (W, u, rng) => ({
      far: filler(rng, W, u, { minW: 5, maxW: 11, minH: 20, maxH: 50, gap: 2 }),
      mid: filler(rng, W, u, { minW: 7, maxW: 15, minH: 16, maxH: 62, gap: 5 }),
      near: filler(rng, W, u, { minW: 8, maxW: 18, minH: 6, maxH: 30, gap: 3, centerScale: 0.5 }),
    }) },
  };

  // Which scene fits a place (a location record from the Worker, or an Open-Meteo geocoding result).
  const KNOWN = {
    buffalo: { country: 'US', names: ['buffalo', 'amherst', 'cheektowaga', 'tonawanda', 'niagara falls', 'lackawanna', 'west seneca'] },
    sandiego: { country: 'US', names: ['san diego', 'la jolla', 'coronado', 'chula vista', 'national city', 'pacific beach', 'ocean beach', 'del mar', 'el cajon', 'la mesa'] },
  };
  function sceneFor(place) {
    const n = (place.name || place.city || '').split(',')[0].trim().toLowerCase();
    for (const [k, { country, names }] of Object.entries(KNOWN)) {
      if (names.includes(n) && (!place.country_code || place.country_code === country)) return k;
    }
    return 'city';
  }

  // ---------- state ----------
  const canvas = document.getElementById('wx');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const debug = params.has('wx');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Configured from _config.yml via _includes/weather-backdrop.html
  const ENDPOINT = canvas.dataset.endpoint || '';
  let FALLBACK = { city: 'Buffalo, NY', name: 'Buffalo', country_code: 'US', lat: 42.8864, lon: -78.8784, scene: 'buffalo' };
  try { if (canvas.dataset.fallback) FALLBACK = { ...FALLBACK, ...JSON.parse(canvas.dataset.fallback) }; } catch { /* keep default */ }
  const state = {
    scene: 'buffalo', seed: 'buffalo', placeName: FALLBACK.city, lat: FALLBACK.lat, lon: FALLBACK.lon,
    weather: 'clouds', style: 'watercolor', night: false, golden: false,
    wind: 0.25, intensity: 0.85, amount: 1, temp: null, utcOffset: null,
    pinned: { weather: false, time: false },
  };
  let W = 0, H = 0, DPR = 1, PX = 4, S = 1;
  let lo = null, sky, city, mask, flakeSprite, noiseTile;
  let clouds = [], fogs = [], flakes = [], drops = [], birds = [];
  let bolt = null, flash = 0, nextStrike = 3, t = 0;
  const isPixel = () => state.style === 'pixel';
  const snap = v => Math.round(v / PX) * PX;

  // ---------- baking ----------
  function makeNoiseTile() {
    const c = makeCanvas(160, 160), g = c.getContext('2d'), img = g.createImageData(160, 160), r = rngFrom(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = r(); img.data[i] = img.data[i + 1] = img.data[i + 2] = v < 0.5 ? 0 : 255; img.data[i + 3] = Math.pow(r(), 3) * 70; }
    g.putImageData(img, 0, 0); return c;
  }
  function paperGrain(g, w, h, a) {
    g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'soft-light';
    g.fillStyle = g.createPattern(noiseTile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  }

  function bakeSky(pal) {
    const c = makeCanvas(W * S, H * S), g = c.getContext('2d');
    const top = hex(pal[0]), bot = hex(pal[1]);
    const rng = rngFrom(hashStr(state.seed + state.weather + state.night));
    const sun = { x: W * 0.12, y: state.golden ? H * 0.5 : H * 0.17, r: state.night ? 20 : 30 };
    const showSun = state.weather === 'clear' || (state.weather === 'clouds' && !state.night);
    const sunCol = state.night ? hex('#f1ecd8') : state.golden ? hex('#ffd9a8') : hex('#fff3d2');
    const starry = state.night && (state.weather === 'clear' || state.weather === 'clouds');
    if (isPixel()) {
      const w = c.width, h = c.height, img = g.createImageData(w, h), d = img.data, bands = 7;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = Math.floor((y / h) * bands + bayer(x, y) - 0.5) / bands;
        let col = mix(top, bot, clamp(q + 0.5 / bands, 0, 1));
        if (showSun) {
          const dist = Math.hypot(x * PX - sun.x, y * PX - sun.y);
          if (dist < sun.r) col = sunCol;
          else { const gl = Math.max(0, 1 - (dist - sun.r) / (sun.r * 4)); if (gl * 0.9 > bayer(x + 1, y + 2) + 0.15) col = mix(col, sunCol, 0.45); }
        }
        const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      if (starry) { g.fillStyle = '#e8ecff'; for (let i = 0; i < W * H / 9000; i++) { g.globalAlpha = 0.4 + rng() * 0.6; g.fillRect(rng() * w | 0, rng() * h * 0.6 | 0, 1, 1); } g.globalAlpha = 1; }
      return c;
    }
    g.setTransform(S, 0, 0, S, 0, 0);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, css(top)); grad.addColorStop(1, css(bot));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = rng() * W, y = rng() * H * 0.8, r = 80 + rng() * 260;
      const col = mix(top, bot, rng()), tint = rng() < 0.5 ? mix(col, [255, 255, 255], 0.35) : mix(col, top, 0.5);
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, css(tint, 0.18)); rg.addColorStop(0.7, css(tint, 0.08)); rg.addColorStop(1, css(tint, 0));
      g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); g.fill();
    }
    if (starry) for (let i = 0; i < W * H / 7000; i++) { g.fillStyle = `rgba(235,240,255,${0.3 + rng() * 0.6})`; g.beginPath(); g.arc(rng() * W, rng() * H * 0.6, 0.4 + rng() * 1.1, 0, Math.PI * 2); g.fill(); }
    if (showSun) {
      const glow = g.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, sun.r * (state.golden ? 9 : 6));
      glow.addColorStop(0, css(sunCol, state.night ? 0.25 : 0.55)); glow.addColorStop(1, css(sunCol, 0));
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { g.fillStyle = css(sunCol, 0.22); g.beginPath(); g.arc(sun.x + (rng() - 0.5) * 3, sun.y + (rng() - 0.5) * 3, sun.r * (0.92 + rng() * 0.1), 0, Math.PI * 2); g.fill(); }
      if (state.night) { g.fillStyle = 'rgba(160,165,180,.25)'; [[-6, -4, 5], [5, 3, 3.5], [3, -8, 2.5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(sun.x + dx, sun.y + dy, r, 0, Math.PI * 2); g.fill(); }); }
    }
    paperGrain(g, W, H, 0.5);
    return c;
  }

  function deform(poly, rng, amt) {
    const out = [], n = poly.length, sx = (rng() - 0.5) * amt, sy = (rng() - 0.5) * amt * 0.6;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (let k = 0; k < steps; k++) { const f = k / steps; out.push([lerp(x0, x1, f) + sx + (rng() - 0.5) * amt, lerp(y0, y1, f) + sy + (rng() - 0.5) * amt]); }
    }
    return out;
  }
  function tracePoly(g, poly, base) {
    g.beginPath(); g.moveTo(poly[0][0], base - poly[0][1]);
    for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], base - poly[i][1]);
    g.closePath();
  }

  function layerWatercolor(polys, color, rng, passes) {
    const lay = makeCanvas(W * S, H * S), lc = lay.getContext('2d');
    const tmp = makeCanvas(W * S, H * S), tc = tmp.getContext('2d');
    tc.setTransform(S, 0, 0, S, 0, 0);
    for (let p = 0; p < passes; p++) {
      tc.clearRect(0, 0, W, H); tc.fillStyle = css(color);
      for (const poly of polys) { tracePoly(tc, deform(poly, rng, 2.6), H + 1); tc.fill(); }
      lc.globalAlpha = 0.12; lc.drawImage(tmp, 0, 0);
    }
    lc.globalAlpha = 1; lc.setTransform(S, 0, 0, S, 0, 0);
    lc.strokeStyle = css(mix(color, [0, 0, 0], 0.25), 0.18); lc.lineWidth = 1.1;
    for (const poly of polys) { tracePoly(lc, deform(poly, rng, 1.8), H + 1); lc.stroke(); }
    lc.globalCompositeOperation = 'destination-out';
    const fade = lc.createLinearGradient(0, H * 0.55, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,.2)');
    lc.fillStyle = fade; lc.fillRect(0, 0, W, H);
    lc.globalAlpha = 0.6; lc.fillStyle = lc.createPattern(noiseTile, 'repeat'); lc.fillRect(0, 0, W, H);
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over';
    return lay;
  }

  function layerPixel(polys, color, rng, windows) {
    const lay = makeCanvas(W * S, H * S), lc = lay.getContext('2d');
    lc.setTransform(S, 0, 0, S, 0, 0); lc.fillStyle = css(color);
    for (const poly of polys) { tracePoly(lc, poly, H); lc.fill(); }
    lc.setTransform(1, 0, 0, 1, 0, 0);
    const img = lc.getImageData(0, 0, lay.width, lay.height);
    for (let i = 3; i < img.data.length; i += 4) {
      const on = img.data[i] > 110; img.data[i] = on ? 255 : 0;
      if (on) { img.data[i - 3] = color[0]; img.data[i - 2] = color[1]; img.data[i - 1] = color[2]; }
    }
    lc.putImageData(img, 0, 0);
    if (windows) {
      lc.globalCompositeOperation = 'source-atop';
      lc.fillStyle = state.night ? '#f3d27a' : css(mix(color, [255, 255, 255], 0.28));
      const p = state.night ? 0.28 : 0.14;
      for (let y = lay.height - 3; y > 0; y -= 3) for (let x = 1; x < lay.width; x += 2) if (rng() < p) lc.fillRect(x, y, 1, 1);
      lc.globalCompositeOperation = 'source-over';
    }
    return lay;
  }

  function addSnowCaps(lay) {
    const off = isPixel() ? 1 : Math.round(2.5 * S);
    const caps = makeCanvas(lay.width, lay.height), cc = caps.getContext('2d');
    cc.drawImage(lay, 0, -off);
    cc.globalCompositeOperation = 'destination-out'; cc.drawImage(lay, 0, 0);
    cc.globalCompositeOperation = 'source-in'; cc.fillStyle = state.night ? '#c9d3e4' : '#ffffff'; cc.fillRect(0, 0, caps.width, caps.height);
    const lc = lay.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalAlpha = isPixel() ? 1 : 0.9; lc.drawImage(caps, 0, 0); lc.globalAlpha = 1;
    return lay;
  }

  function bakeCity(pal) {
    const c = makeCanvas(W * S, H * S), g = c.getContext('2d');
    const rng = rngFrom(hashStr(state.seed));
    const hs = clamp(H * 0.4, 150, 400), u = hs / 100;
    const scene = SCENES[state.scene] || SCENES.city;
    const def = scene.build(W, u, rng);
    const skyTop = hex(pal[0]), skyBot = hex(pal[1]), ink = state.night ? INK.night : INK.day;
    const tint = scene.tint || [1, 1, 1];
    const snowy = state.weather === 'snow';
    const colFor = k => mix(skyBot, ink, k).map((v, i) => clamp(v * lerp(1, tint[i], Math.min(1, k * 1.4)), 0, 255));
    const draw = (polys, col, passes, windows) => isPixel() ? layerPixel(polys, col, rng, windows) : layerWatercolor(polys, col, rng, passes);
    const capCol = mix([255, 255, 255], skyBot, state.night ? 0.55 : 0.12);
    const steps = [['far', 0.28, 9], ['mid', 0.52, 12], ['water'], ['near', 0.76, 15]];
    for (const [name, k, passes] of steps) {
      if (name === 'water') {
        if (!def.water) continue;
        const wcol = mix(mix(skyBot, skyTop, 0.55), ink, 0.2);
        g.drawImage(draw([box(-20, 0, W + 40, def.water)], wcol, 10, false), 0, 0);
        g.save(); g.setTransform(S, 0, 0, S, 0, 0);
        g.fillStyle = css(mix(skyBot, [255, 255, 255], 0.4), isPixel() ? 1 : 0.4);
        for (let i = 0; i < W / 12; i++) {
          const y = H - 2 - rng() * def.water * 0.9, x = rng() * W, w = 6 + rng() * 30;
          if (isPixel()) g.fillRect(snap(x), snap(y), Math.max(PX, snap(w)), PX); else g.fillRect(x, y, w, 1);
        }
        g.restore();
        continue;
      }
      const polys = def[name] || [];
      if (!polys.length) continue;
      if (name === 'near' && !def.water) polys.push(box(-20, 0, W + 40, 1.6 * u));
      let lay = draw(polys, colFor(k), passes, name !== 'far' && def.windows !== false);
      if (snowy && name !== 'far') lay = addSnowCaps(lay);
      g.drawImage(lay, 0, 0);
      if (def.caps?.[name]?.length) g.drawImage(draw(def.caps[name], capCol, 9, false), 0, 0);
    }
    for (const a of def.accents || []) {
      let col = mix(hex(a.color), skyBot, 0.28);
      if (state.night) col = mix(col, ink, 0.6);
      let lay = draw(a.polys, col, 13, false);
      if (snowy) lay = addSnowCaps(lay);
      g.drawImage(lay, 0, 0);
    }
    if (!isPixel()) { g.setTransform(S, 0, 0, S, 0, 0); paperGrain(g, W, H, 0.35); }
    return c;
  }

  // Half-width of the text column, measured from the page so the backdrop never sits behind text.
  const TEXT_GUTTER = 28;   // px of clear space beside the text
  const TEXT_TINT = 0.05;   // max backdrop opacity behind text (keeps WCAG contrast for every text color)
  function textHalfWidth() {
    const el = document.querySelector('.page-content .wrapper');
    if (!el) return Math.min(W, 800) / 2;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return (r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 2;
  }
  let maskInner = 400;
  function maskAlpha(x, y) {
    const d = Math.abs(x - W / 2), inner = maskInner;
    const room = W / 2 - inner;                         // side margin available for scenery
    if (d < inner || room < 24) return Math.min(TEXT_TINT, smooth(0, H * 0.25, y) * TEXT_TINT) * state.intensity;
    const fade = clamp(room * 0.7, 40, 240);
    const wob = isPixel() ? 0 : (Math.sin(y * 0.012 + 1.3) * 0.5 + Math.sin(y * 0.031 + 4) * 0.3 + Math.sin(y * 0.077) * 0.2) * Math.min(34, fade * 0.3);
    const side = smooth(inner, inner + fade, d + wob * smooth(inner, inner + fade * 0.6, d));
    return Math.max(TEXT_TINT, side) * state.intensity;
  }
  function bakeMask() {
    maskInner = textHalfWidth() + TEXT_GUTTER;
    const q = isPixel() ? PX : 4;
    const c = makeCanvas(W / q, H / q), g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const a = maskAlpha(x * q, y * q);
      img.data[(y * c.width + x) * 4 + 3] = (isPixel() ? Math.round(a * 8) / 8 : a) * 255;
    }
    g.putImageData(img, 0, 0); return c;
  }

  function cloudSprite(rng, w, h, light, shade) {
    if (isPixel()) {
      const c = makeCanvas(w / PX, h / PX), g = c.getContext('2d'), n = 6 + (rng() * 4 | 0);
      g.fillStyle = css(light);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), x = lerp(0.18, 0.82, f) * c.width, r = (0.17 + Math.sin(f * Math.PI) * 0.22 + rng() * 0.06) * c.height;
        g.beginPath(); g.arc(x, c.height - r - 1, r, 0, Math.PI * 2); g.fill();
      }
      ditherAlpha(c, 1.5);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = css(shade); g.fillRect(0, Math.round(c.height * 0.68), c.width, c.height);
      return { c, w, h };
    }
    const c = makeCanvas(w * S, h * S), g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0);
    for (let i = 0; i < 26; i++) {
      const f = rng(), x = lerp(0.15, 0.85, f) * w, bump = Math.sin(f * Math.PI);
      const y = h * (0.75 - bump * 0.3 * rng()), r = h * (0.18 + bump * 0.28) * (0.7 + rng() * 0.5), col = y > h * 0.62 ? shade : light;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, css(col, 0.32)); rg.addColorStop(0.65, css(col, 0.18)); rg.addColorStop(1, css(col, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return { c, w, h };
  }
  function fogSprite(w, h, col) {
    const sc = isPixel() ? 1 / PX : S;
    const c = makeCanvas(w * sc, h * sc), g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0);
    g.translate(w / 2, h / 2); g.scale(w / h, 1);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, h / 2);
    rg.addColorStop(0, css(col, 0.55)); rg.addColorStop(1, css(col, 0));
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, h / 2, 0, Math.PI * 2); g.fill();
    if (isPixel()) ditherAlpha(c, 1.1);
    return { c, w, h };
  }
  function makeFlakeSprite() {
    const r = 8, c = makeCanvas(r * 2 * S, r * 2 * S), g = c.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0);
    const rg = g.createRadialGradient(r, r, 0, r, r, r);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,.85)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, r * 2, r * 2); return c;
  }

  // ---------- dynamic elements ----------
  function initDynamic() {
    const rng = rngFrom(hashStr(state.seed + state.weather + 'dyn'));
    const wx = state.weather, dark = wx === 'rain' || wx === 'storm', nightK = state.night ? 0.55 : 0;
    let light = dark ? hex('#a7b1bc') : hex('#ffffff'), shade = dark ? hex('#6c7784') : hex('#cfd6de');
    if (state.golden) { light = mix(light, hex('#ffd2b0'), 0.5); shade = mix(shade, hex('#b98a8a'), 0.4); }
    light = mix(light, hex('#2a3242'), nightK); shade = mix(shade, hex('#141a24'), nightK);
    const counts = { clear: 2, clouds: 7, rain: 8, snow: 6, fog: 3, storm: 9 };
    clouds = [];
    for (let i = 0; i < counts[wx]; i++) {
      const w = 180 + rng() * 260, h = w * (0.32 + rng() * 0.1);
      clouds.push({ s: cloudSprite(rng, w, h, light, shade), x: rng() * (W + w) - w, y: H * (0.02 + rng() * 0.38) - h * 0.3, v: 6 + rng() * 14 });
    }
    fogs = [];
    if (wx === 'fog' || wx === 'rain' || wx === 'storm') {
      const n = wx === 'fog' ? 7 : 3, col = state.night ? hex('#5a626d') : hex('#f4f5f5');
      for (let i = 0; i < n; i++) { const w = W * (0.5 + rng() * 0.6), h = 60 + rng() * 90; fogs.push({ s: fogSprite(w, h, col), x: rng() * W - w / 2, y: H * (0.45 + rng() * 0.5) - h / 2, v: (rng() - 0.5) * 16 }); }
    }
    flakes = []; drops = [];
    const area = W * H;
    if (wx === 'snow') for (let i = 0; i < area / 5200 * state.amount; i++) { const z = 0.25 + rng() * 0.75; flakes.push({ x: rng() * W, y: rng() * H, z, f: 0.4 + rng() * 1.1, ph: rng() * 6.28, a: 12 + rng() * 26 }); }
    if (dark) for (let i = 0; i < area / (wx === 'storm' ? 3200 : 5000) * state.amount; i++) drops.push({ x: rng() * W, y: rng() * H, z: 0.3 + rng() * 0.7 });
    birds = [];
    if (wx === 'clear' && !state.night) for (let i = 0; i < 4; i++) birds.push({ x: rng() * W, y: H * (0.14 + rng() * 0.2), ph: rng() * 6.28, v: 26 + rng() * 18 });
    bolt = null; flash = 0; nextStrike = 2 + rng() * 3;
  }

  function makeBolt() {
    const left = Math.random() < 0.5;
    let x = left ? W * (0.04 + Math.random() * 0.2) : W * (0.76 + Math.random() * 0.2), y = H * 0.12;
    const main = [[x, y]], branches = [], end = H * (0.62 + Math.random() * 0.12);
    while (y < end) {
      x += (Math.random() - 0.5) * 34; y += 12 + Math.random() * 22; main.push([x, y]);
      if (Math.random() < 0.14) {
        const b = [[x, y]]; let bx = x, by = y;
        for (let k = 0; k < 4; k++) { bx += (Math.random() - 0.3) * 28 * (left ? 1 : -1); by += 10 + Math.random() * 14; b.push([bx, by]); }
        branches.push(b);
      }
    }
    return { paths: [main, ...branches], life: 0.32 };
  }

  function update(dt) {
    const wind = state.wind;
    for (const c of clouds) { c.x += c.v * (1 + Math.abs(wind) * 2) * Math.sign(wind || 1) * dt; if (c.x > W + 20) c.x = -c.s.w - 20; if (c.x < -c.s.w - 30) c.x = W + 10; }
    for (const f of fogs) { f.x += (f.v + wind * 10) * dt; if (f.x > W) f.x = -f.s.w; if (f.x < -f.s.w) f.x = W; }
    for (const f of flakes) {
      f.y += (16 + f.z * 44) * dt; f.x += (wind * 70 * f.z + Math.sin(t * f.f + f.ph) * f.a * 0.6) * dt;
      if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
      if (f.x > W + 6) f.x = -6; else if (f.x < -6) f.x = W + 6;
    }
    for (const d of drops) { d.y += (520 + d.z * 420) * dt; d.x += wind * 160 * d.z * dt; if (d.y > H + 20) { d.y = -20 - Math.random() * 60; d.x = Math.random() * (W + 200) - 100; } }
    for (const b of birds) { b.x += b.v * dt; b.y += Math.sin(t * 0.7 + b.ph) * 4 * dt; if (b.x > W + 20) { b.x = -20; b.y = H * (0.14 + Math.random() * 0.2); } }
    if (state.weather === 'storm') {
      nextStrike -= dt;
      if (nextStrike <= 0) { bolt = makeBolt(); flash = 1; nextStrike = 4 + Math.random() * 7; setTimeout(() => { flash = Math.max(flash, 0.7); }, 140); }
      if (bolt) { bolt.life -= dt; if (bolt.life <= 0) bolt = null; }
      flash = Math.max(0, flash - dt * 2.6);
    }
  }

  function pxLine(g, x0, y0, x1, y1) {
    x0 = Math.round(x0 / PX); y0 = Math.round(y0 / PX); x1 = Math.round(x1 / PX); y1 = Math.round(y1 / PX);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 400; i++) {
      g.fillRect(x0 * PX, y0 * PX, PX, PX);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function render() {
    if (state.style === 'off') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    const px = isPixel(), g = px ? lo.getContext('2d') : ctx;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.imageSmoothingEnabled = !px; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    g.drawImage(sky, 0, 0, W, H);
    for (const c of clouds) g.drawImage(c.s.c, px ? snap(c.x) : c.x, px ? snap(c.y) : c.y, c.s.w, c.s.h);
    g.drawImage(city, 0, 0, W, H);
    for (const f of fogs) g.drawImage(f.s.c, px ? snap(f.x) : f.x, px ? snap(f.y) : f.y, f.s.w, f.s.h);

    if (birds.length) {
      g.fillStyle = g.strokeStyle = 'rgba(40,46,58,.7)'; g.lineWidth = 1.3;
      for (const b of birds) {
        const up = Math.sin(t * 7 + b.ph) > 0;
        if (px) { const bx = snap(b.x), by = snap(b.y), dy = up ? -PX : PX; [[-2, dy], [-1, 0], [0, 0], [1, 0], [2, dy]].forEach(([k, yy]) => g.fillRect(bx + k * PX, by + yy, PX, PX)); }
        else { const w = up ? -4 : 2.5; g.beginPath(); g.moveTo(b.x - 7, b.y + w); g.quadraticCurveTo(b.x - 3, b.y - 3, b.x, b.y); g.quadraticCurveTo(b.x + 3, b.y - 3, b.x + 7, b.y + w); g.stroke(); }
      }
    }
    if (flakes.length) {
      if (px) { g.fillStyle = state.night ? '#dfe6f2' : '#ffffff'; for (const f of flakes) { const s = f.z > 0.72 ? 2 : 1; g.fillRect(snap(f.x), snap(f.y), PX * s, PX * s); } }
      else { for (const f of flakes) { const r = 1 + f.z * 2.6; g.globalAlpha = 0.45 + f.z * 0.55; g.drawImage(flakeSprite, f.x - r * 2, f.y - r * 2, r * 4, r * 4); } g.globalAlpha = 1; }
    }
    if (drops.length) {
      const col = state.night ? '170,190,212' : '78,98,122';
      if (px) {
        g.fillStyle = `rgb(${col})`;
        for (const d of drops) { const n = d.z > 0.65 ? 4 : 3, slope = state.wind * 0.3, bx = snap(d.x), by = snap(d.y); for (let k = 0; k < n; k++) g.fillRect(bx + Math.round(k * slope) * PX, by + k * PX, PX, PX); }
      } else {
        g.lineCap = 'round';
        for (const [lo_, hi] of [[0, 0.45], [0.45, 0.75], [0.75, 1.01]]) {
          g.strokeStyle = `rgba(${col},${0.12 + hi * 0.28})`; g.lineWidth = 0.6 + hi * 0.7; g.beginPath();
          for (const d of drops) { if (d.z < lo_ || d.z >= hi) continue; const len = 10 + d.z * 16; g.moveTo(d.x, d.y); g.lineTo(d.x + state.wind * len * 0.3, d.y + len); }
          g.stroke();
        }
      }
    }
    if (bolt) {
      if (px) { g.fillStyle = '#fbfbff'; for (const p of bolt.paths) for (let i = 1; i < p.length; i++) pxLine(g, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]); }
      else {
        g.lineJoin = 'round';
        for (const [lw, a] of [[7, 0.12], [3, 0.35], [1.4, 0.95]]) {
          g.strokeStyle = `rgba(245,247,255,${a})`;
          bolt.paths.forEach((p, i) => { g.lineWidth = i ? lw * 0.55 : lw; g.beginPath(); p.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); });
        }
      }
    }
    if (flash > 0) { g.fillStyle = `rgba(235,240,255,${flash * 0.32})`; g.fillRect(0, 0, W, H); }

    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    if (px) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(lo, 0, 0, lo.width * PX * DPR, lo.height * PX * DPR);
    }
  }

  // ---------- lifecycle ----------
  function palette() {
    let pal = SKY[state.weather][state.night ? 'night' : 'day'];
    if (state.golden && !state.night) {
      const warm = state.weather === 'clear' ? 0.75 : 0.4;
      pal = [toHex(mix(hex(pal[0]), hex('#6f7fb4'), warm * 0.6)), toHex(mix(hex(pal[1]), hex('#f3a77c'), warm))];
    }
    return pal;
  }
  function rebuild() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    PX = W > 1700 ? 5 : 4;
    S = isPixel() ? 1 / PX : DPR;
    if (isPixel()) lo = makeCanvas(W / PX, H / PX);
    if (state.style === 'off') { render(); return; }
    noiseTile = noiseTile || makeNoiseTile();
    flakeSprite = makeFlakeSprite();
    const pal = palette();
    sky = bakeSky(pal); city = bakeCity(pal); mask = bakeMask();
    initDynamic();
    if (reduceMotion) { for (let i = 0; i < 30; i++) update(1 / 30); flash = 0; bolt = null; }
    render();
    canvas.classList.add('is-ready');
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (state.style !== 'off') { update(dt); render(); }
    requestAnimationFrame(loop);
  }
  if (!reduceMotion) requestAnimationFrame(loop);
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(rebuild, 150); });

  // ---------- badge ----------
  const WORDS = { clear: 'clear skies', clouds: 'cloudy', rain: 'raining', snow: 'snowing', fog: 'foggy', storm: 'thunderstorms' };
  function localClock() {
    if (state.utcOffset == null) return '';
    return new Date(Date.now() + state.utcOffset * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  }
  function updateBadge() {
    const parts = [state.placeName], clock = localClock();
    if (clock) parts.push(clock);
    if (state.temp != null) parts.push(`${Math.round(state.temp)}°C`);
    parts.push(WORDS[state.weather]);
    setText('wx-badge-text', parts.join(' · '));
  }
  setInterval(updateBadge, 30000);

  // ---------- live weather (Open-Meteo) ----------
  function wmoToWeather(code) {
    if (code <= 1) return 'clear';
    if (code <= 3) return 'clouds';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }
  const $ = id => document.getElementById(id);
  const setText = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const note = msg => setText('wx-note', msg);

  async function goLive() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=weather_code,is_day,temperature_2m,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
      const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json(), c = data.current;
      state.utcOffset = data.utc_offset_seconds;
      state.temp = c.temperature_2m;
      if (!state.pinned.weather) state.weather = wmoToWeather(c.weather_code);
      if (!state.pinned.time) {
        // times are local to the destination ("2026-11-08T15:15"); compare minutes of day
        const mins = iso => { const [h, m] = iso.slice(11, 16).split(':').map(Number); return h * 60 + m; };
        const now = mins(c.time), rise = mins(data.daily.sunrise[0]), set = mins(data.daily.sunset[0]);
        state.night = c.is_day === 0;
        state.golden = !state.night && (Math.abs(now - rise) < 50 || Math.abs(now - set) < 50);
      }
      const dir = Math.sin((c.wind_direction_10m - 180) * Math.PI / 180);
      state.wind = clamp(dir * c.wind_speed_10m / 30, -1, 1);
      setText('wx-live', `Live · ${c.time.slice(11, 16)} local · ${WORDS[wmoToWeather(c.weather_code)]}${c.is_day ? '' : ' · night'} · ${c.temperature_2m}°C`);
    } catch (e) {
      setText('wx-live', 'Live weather unavailable: ' + e.message);
    }
    syncControls(); updateBadge(); rebuild();
  }
  setInterval(goLive, 15 * 60 * 1000);

  function setPlace({ scene, name, lat, lon, seed }) {
    state.scene = SCENES[scene] ? scene : 'city'; state.placeName = name; state.lat = lat; state.lon = lon;
    state.seed = seed || scene; state.temp = null; state.utcOffset = null;
  }
  // A location record from the Worker (or the fallback in _config.yml)
  function setLocation(loc) {
    setPlace({ scene: loc.scene || sceneFor(loc), name: loc.city, lat: loc.lat, lon: loc.lon, seed: (loc.name || loc.city || '').toLowerCase() });
  }
  async function loadLocation() {
    if (!ENDPOINT) return FALLBACK;
    try {
      const r = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const loc = await r.json();
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) throw new Error('bad location');
      return loc;
    } catch (e) {
      note('Location API unavailable (' + e.message + '), using fallback.');
      return FALLBACK;
    }
  }
  async function lookup(q) {
    if (!q) return;
    note('Looking up ' + q + '…');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
      const hit = (await r.json()).results?.[0];
      if (!hit) { note('No match for ' + q + '.'); return; }
      const scene = sceneFor(hit);
      const region = hit.country_code === 'US' ? hit.admin1 : hit.country;
      setPlace({ scene, name: region ? `${hit.name}, ${region}` : hit.name, lat: hit.latitude, lon: hit.longitude, seed: hit.name.toLowerCase() });
      note(`${hit.name}: elevation ${Math.round(hit.elevation ?? 0)} m, population ${hit.population ?? 'n/a'} → ${SCENES[scene].label}`);
      await goLive();
    } catch (e) { note('Lookup failed: ' + e.message); }
  }

  // ---------- debug panel (?wx) ----------
  // ?wx  shows the panel. Optional: &scene=tokyo &weather=snow &time=night|golden|day &style=pixel &q=Chamonix
  const PANEL_HTML = `
    <summary>Backdrop test panel</summary>
    <div class="wx-body">
      <label>Scene <select id="wx-scene"></select></label>
      <label>Look up any place <input id="wx-search" type="text" placeholder="e.g. Chamonix, Saint-Malo, Tucson"></label>
      <button type="button" id="wx-lookup">Search</button>
      <div class="wx-note" id="wx-live">Loading live weather…</div>
      <div class="wx-sep">Preview override</div>
      <div class="wx-row">
        <label>Weather <select id="wx-weather">${Object.keys(SKY).map(k => `<option value="${k}">${k}</option>`).join('')}</select></label>
        <label>Time <select id="wx-time"><option value="day">day</option><option value="golden">golden hour</option><option value="night">night</option></select></label>
      </div>
      <div class="wx-seg" id="wx-style">
        <button type="button" data-v="watercolor">Watercolor</button><button type="button" data-v="pixel">Pixel</button><button type="button" data-v="off">Off</button>
      </div>
      <label>Intensity <input id="wx-intensity" type="range" min="0.2" max="1" step="0.05"></label>
      <button type="button" id="wx-live-btn" class="wx-secondary">Back to live</button>
      <div class="wx-note" id="wx-note"></div>
    </div>`;
  function syncControls() {
    if (!debug) return;
    $('wx-scene').value = state.scene; $('wx-weather').value = state.weather;
    $('wx-time').value = state.night ? 'night' : state.golden ? 'golden' : 'day';
    $('wx-intensity').value = state.intensity;
    document.querySelectorAll('#wx-style button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.style)));
  }
  function applyTime(v) { state.night = v === 'night'; state.golden = v === 'golden'; }
  function mountPanel() {
    const panel = document.createElement('details');
    panel.className = 'wx-panel'; panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);
    for (const [k, s] of Object.entries(SCENES)) $('wx-scene').add(new Option(s.label, k));
    $('wx-scene').addEventListener('change', e => { const k = e.target.value, s = SCENES[k]; setPlace({ scene: k, name: s.label, lat: s.home[0], lon: s.home[1] }); goLive(); });
    $('wx-lookup').addEventListener('click', () => lookup($('wx-search').value.trim()));
    $('wx-search').addEventListener('keydown', e => { if (e.key === 'Enter') lookup($('wx-search').value.trim()); });
    $('wx-weather').addEventListener('change', e => { state.pinned.weather = true; state.weather = e.target.value; updateBadge(); rebuild(); });
    $('wx-time').addEventListener('change', e => { state.pinned.time = true; applyTime(e.target.value); rebuild(); });
    $('wx-intensity').addEventListener('input', e => { state.intensity = +e.target.value; if (state.style !== 'off') { mask = bakeMask(); render(); } });
    document.querySelectorAll('#wx-style button').forEach(b => b.addEventListener('click', () => { state.style = b.dataset.v; syncControls(); rebuild(); }));
    $('wx-live-btn').addEventListener('click', async () => { state.pinned = { weather: false, time: false }; setLocation(await loadLocation()); goLive(); });
  }

  // ---------- start ----------
  async function start() {
    if (debug) mountPanel();
    setLocation(await loadLocation());
    if (debug) {
      const ps = params.get('scene'), pw = params.get('weather'), pt = params.get('time'), pst = params.get('style');
      if (ps && SCENES[ps]) setPlace({ scene: ps, name: SCENES[ps].label, lat: SCENES[ps].home[0], lon: SCENES[ps].home[1] });
      if (pw && SKY[pw]) { state.weather = pw; state.pinned.weather = true; }
      if (pt && ['day', 'night', 'golden'].includes(pt)) { applyTime(pt); state.pinned.time = true; }
      if (pst && ['watercolor', 'pixel', 'off'].includes(pst)) state.style = pst;
      if (params.get('q')) return lookup(params.get('q'));
    }
    updateBadge();
    goLive();
  }
  start();
})();
