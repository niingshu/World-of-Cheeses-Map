# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive world map that displays cheeses by geographic origin. Users can click markers to see cheese details in a side panel, search by name, filter by country, and toggle dark/light mode.

## Commands

```bash
# Start the backend API server (requires MongoDB running locally)
node backend/server.js

# Seed MongoDB from processed JSON data
node backend/data/seed.js

# Data pipeline (run from backend/scripts/, requires venv)
source backend/scripts/venv/bin/activate
python backend/scripts/clean_cheeses_json.py   # raw → cleaned (removes unused fields)
python backend/scripts/geo_cheeses_json.py      # cleaned → geocoded (adds lat/lon via Nominatim, requires geopy)
python backend/scripts/cheese_img_json.py       # geocoded → final (scrapes images from cheese.com + Wikipedia fallback)
```

No test framework, linter, or build step is configured.

## Architecture

**Backend** — Node.js/Express (CommonJS) with Mongoose connecting to a local MongoDB (`cheeseDB`).
- `backend/server.js` — Entry point. Connects to MongoDB, mounts routes at `/api/cheeses`.
- `backend/routes/cheeses.js` — Three GET endpoints: list all (with optional `country`/`region`/`name` regex filters), `/countries` (distinct country list), `/:id` (single cheese).
- `backend/models/Cheese.js` — Mongoose schema: `lat`, `lon`, `cheese`, `image`, `url`, `milk`, `country`, `region`, `type`, `texture`, `color`, `flavor`.

**Frontend** — Vanilla HTML/CSS/JS (no framework, no bundler). Loaded via `<script>` tags — order matters (`api.js` before `map.js` before `ui.js`).
- `frontend/js/api.js` — `fetchCheeses()` hits `http://localhost:8000/api/cheeses`. Hardcoded `API_BASE`.
- `frontend/js/map.js` — Initializes a Leaflet map with OpenStreetMap tiles, renders cheese markers using `leaflet.markercluster`, handles click-to-highlight, side panel display, and `closePanel()`/`onCheeseClick()` functions.
- `frontend/js/ui.js` — Search input with debounced lookup, country filter dropdown, dark/light mode toggle, keyboard (Escape) and map-click listeners to close the panel and reset markers.
- Dark/light mode is toggled via a `.dark-mode` class on `<body>`. Dark mode applies CSS filter inversion on Leaflet layers and swaps the title bar to navy, panel to pastel blue.
- Fonts: Playfair Display (title, cheese name) and Inter (body text) via Google Fonts.

**Data Pipeline** — Python scripts that transform raw scraped cheese data into seeding-ready JSON:
1. `clean_cheeses_json.py` — Strips unused fields from `data/raw/cheeses.json` → `data/processed/cheeses_clean_no_loc.json`
2. `geo_cheeses_json.py` — Geocodes each cheese's region/country via Nominatim with a file-based cache (`geo_cache.json`) → `data/processed/cheeses_clean_geo.json`
3. `cheese_img_json.py` — Scrapes cheese images from cheese.com, falls back to Wikipedia REST API for nulls. Uses two caches: `img_cache.json` (cheese.com) and `wiki_img_cache.json` (Wikipedia) → `data/processed/final_cheeses.json`

## Key Details

- `.env` at project root holds `MONGO_URI` and `PORT`. Backend loads it via `dotenv` with relative path `../`.
- Frontend API base URL is hardcoded to `http://localhost:8000` in `api.js`.
- The seed script (`data/seed.js`) drops all existing cheeses before inserting — it is destructive.
- Geocoding script uses a persistent `geo_cache.json` to avoid re-fetching coordinates. This file is gitignored.
- Image scraping caches (`img_cache.json`, `wiki_img_cache.json`) persist results (including nulls) to avoid re-scraping on rerun.
- ~39% of cheeses have images (438 from cheese.com + 26 from Wikipedia). The rest use a placeholder (`images/no-cheese.jpg`).
