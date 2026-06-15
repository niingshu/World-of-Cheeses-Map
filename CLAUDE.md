# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive world map that displays cheeses by geographic origin. Users can click markers to see cheese details in a side panel with image carousel, description, pairings, and similar cheeses. Features include search by name, filter by country, dark/light mode toggle, and a "Want to Try" wishlist.

## Commands

```bash
# Start the backend API server (requires MongoDB running locally)
node backend/server.js

# Seed MongoDB from processed JSON data
node backend/data/seed.js

# Data pipeline (run from backend/scripts/, requires venv)
source backend/scripts/venv/bin/activate
python backend/scripts/clean_cheeses_json.py     # raw → cleaned (removes unused fields)
python backend/scripts/geo_cheeses_json.py        # cleaned → geocoded (adds lat/lon via Nominatim, requires geopy)
python backend/scripts/cheese_img_json.py         # geocoded → adds primary image (cheese.com + Wikipedia fallback)
python backend/scripts/cheese_desc_json.py        # adds description + manufacture text from Wikipedia
python backend/scripts/cheese_images_json.py      # scrapes multiple images from Wikipedia for carousel
python backend/scripts/cheese_pairing_json.py     # generates pairings based on cheese type/flavor
python backend/scripts/pairing_info_json.py       # fetches pairing item info (image, description, wiki link) → frontend/data/pairing_info.json
```

No test framework, linter, or build step is configured.

## Architecture

**Backend** — Node.js/Express (CommonJS) with Mongoose connecting to a local MongoDB (`cheeseDB`).
- `backend/server.js` — Entry point. Connects to MongoDB, mounts routes at `/api/cheeses` and `/api/saved`.
- `backend/routes/cheeses.js` — Three GET endpoints: list all (with optional `country`/`region`/`name` regex filters), `/countries` (distinct country list with multi-country splitting), `/:id` (single cheese).
- `backend/routes/saved.js` — Wishlist CRUD: GET `/` (list saved, populates full cheese), POST `/:cheeseId` (save), DELETE `/:cheeseId` (unsave).
- `backend/models/Cheese.js` — Mongoose schema: `lat`, `lon`, `cheese`, `image`, `url`, `milk`, `country`, `region`, `type`, `texture`, `color`, `flavor`, `description`, `manufacture`, `pairings` (array), `images` (array).
- `backend/models/SavedCheese.js` — Mongoose schema: `cheeseId` (ObjectId ref to Cheese, unique). Tracks the "Want to Try" wishlist.

**Frontend** — Vanilla HTML/CSS/JS (no framework, no bundler). Loaded via `<script>` tags — order matters (`api.js` → `countryFlags.js` → `map.js` → `ui.js`).
- `frontend/js/api.js` — `fetchCheeses()` and wishlist helpers (`fetchSavedCheeses`, `saveCheese`, `unsaveCheese`). Maintains a `savedSet` of cheese IDs. Hardcoded `API_BASE` to `http://localhost:8000`.
- `frontend/js/countryFlags.js` — `COUNTRY_TO_ISO` mapping and helpers (`getCountryCode`, `getFlagUrl`, `getGeoJSONCountryName`) for displaying country flags via flagcdn.com.
- `frontend/js/map.js` — Initializes Leaflet map with OpenStreetMap tiles and `leaflet.markercluster`. Key features:
  - `cheesePanel()` — Builds the side panel: image carousel (with dots/arrows), cheese fields, country flag, mini-map with GeoJSON country highlight, description, manufacture, pairings (clickable → `showPairingDetail`), similar cheeses, "Save to Trylist" button, and link to cheese.com.
  - `showPairingDetail()` — Sub-panel for pairing items showing image, description, and Wikipedia link from `pairing_info.json`.
  - `findSimilarCheeses()` — Finds cheeses matching by type and milk.
  - Mini-map renders a highlighted country shape from `frontend/data/countries.geo.json` with a region circle marker.
- `frontend/js/ui.js` — Search input with debounced lookup, country filter dropdown, dark/light mode toggle, wishlist dropdown with badge count, keyboard (Escape) and map-click listeners.
- `frontend/data/countries.geo.json` — GeoJSON for country shapes used by the panel mini-map.
- `frontend/data/pairing_info.json` — Pre-scraped pairing item metadata (image, description, wiki URL).
- Dark/light mode toggles a `.dark-mode` class on `<body>`. Affects Leaflet layers, title bar, panel, and mini-map colors.
- Fonts: Playfair Display (title, cheese name) and Inter (body text) via Google Fonts.

**Data Pipeline** — Python scripts that transform raw scraped cheese data into seeding-ready JSON:
1. `clean_cheeses_json.py` — Strips unused fields from `data/raw/cheeses.json` → `data/processed/cheeses_clean_no_loc.json`
2. `geo_cheeses_json.py` — Geocodes each cheese's region/country via Nominatim with a file-based cache (`geo_cache.json`) → `data/processed/cheeses_clean_geo.json`
3. `cheese_img_json.py` — Scrapes primary cheese image from cheese.com, falls back to Wikipedia REST API. Uses caches: `img_cache.json`, `wiki_img_cache.json` → `data/processed/final_cheeses.json`
4. `cheese_desc_json.py` — Scrapes description and manufacture text from Wikipedia. Uses `desc_cache.json` → updates `final_cheeses.json`
5. `cheese_images_json.py` — Scrapes multiple images from Wikipedia (filters out logos/icons/maps). Uses `images_cache.json` → updates `final_cheeses.json`
6. `cheese_pairing_json.py` — Generates wine/food pairings based on cheese type using hardcoded lookup tables. Uses `pairing_cache.json` → updates `final_cheeses.json`
7. `pairing_info_json.py` — Fetches pairing item info (summary, image, wiki link) from Wikipedia. Uses `pairing_info_cache.json` → outputs `frontend/data/pairing_info.json`

## Key Details

- `.env` at project root holds `MONGO_URI` and `PORT`. Backend loads it via `dotenv` with relative path `../`.
- Frontend API base URL is hardcoded to `http://localhost:8000` in `api.js`.
- The seed script (`data/seed.js`) drops all existing cheeses before inserting — it is destructive.
- All pipeline scripts use persistent JSON caches (gitignored) to avoid re-fetching on rerun. Scripts 4–7 read and write `final_cheeses.json` in place.
- Wikipedia scraping scripts use a `CheeseMapBot/1.0` user agent.
