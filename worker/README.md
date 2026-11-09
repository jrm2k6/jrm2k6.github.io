# Location API

A small Cloudflare Worker that stores where I am, so the weather backdrop on jeremydagorn.com can show that city's live weather, local time and scenery. Jekyll is unchanged: the site just reads `GET /location` when a page loads.

- `GET /location`: public. Returns city-level data only, cached for 60 s.
- `PUT /location`: needs `Authorization: Bearer <ADMIN_TOKEN>`.
  - `{"query": "Chamonix"}` looks a place up by name (Open-Meteo geocoding).
  - `{"lat": 45.92, "lon": 6.87}` reverse-geocodes coordinates (OpenStreetMap Nominatim), e.g. from phone GPS.
  - Optional `"scene"`: `auto` (default, the page picks) or one of `buffalo`, `sandiego`, `city` (generic skyline).

Coordinates are rounded to 2 decimals (about 1 km) before any lookup or storage. When a place matches, the city center is stored, not your position.

## Deploy (one time)

```sh
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create jeremydagorn-location-api   # paste the printed id into wrangler.toml
                                                             # (the title is just a label; the code uses the
                                                             #  binding name LOCATION from wrangler.toml)
npx wrangler secret put ADMIN_TOKEN         # paste a long random string, e.g. from: openssl rand -hex 24
npx wrangler deploy                         # prints https://jeremydagorn-location-api.<account>.workers.dev
```

Then set the endpoint in `_config.yml` and push:

```yaml
weather_backdrop:
  endpoint: "https://jeremydagorn-location-api.<account>.workers.dev/location"
```

Optional: put it on your own domain (for example `api.jeremydagorn.com`) under Workers → Settings → Domains & Routes. If you do, update the endpoint above.

## Updating the location

- **Admin page**: <https://jeremydagorn.com/admin/>. Type a city or tap "Use my current location". The token can be remembered on that device.
- **curl**:
  ```sh
  curl -X PUT https://jeremydagorn-location-api.<account>.workers.dev/location \
    -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"query":"La Jolla"}'
  ```
- **iOS Shortcut** (one tap, or automatic):
  1. *Get Current Location*
  2. *Get Contents of URL*: URL `https://jeremydagorn-location-api.<account>.workers.dev/location`, Method `PUT`, Headers `Authorization: Bearer <token>`, Request Body `JSON` with `lat` = Current Location › Latitude and `lon` = Current Location › Longitude
  3. Optional: add a Personal Automation (for example "When I arrive at an airport" or daily at 9:00) that runs it.

## Local development

```sh
npm test                                     # unit tests, no network
ADMIN_TOKEN=local-dev-token npm run dev      # worker on http://localhost:8787 with in-memory storage
# in the repo root:
bundle exec jekyll serve --config _config.yml,_config.dev.yml
```

Open <http://localhost:4000/?wx> for the backdrop test panel, and <http://localhost:4000/admin/> to set a location against the local worker.
