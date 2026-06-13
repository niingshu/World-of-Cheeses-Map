import requests
import json
import os
import time
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "pairing_info.json"
CACHE_FILE = BASE_DIR / "data" / "processed" / "pairing_info_cache.json"
WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
HEADERS = {"User-Agent": "CheeseMapBot/1.0 (shuning010506@gmail.com)"}

SEARCH_HINTS = {
    "Aged Bordeaux": "Bordeaux wine",
    "Aged Burgundy": "Burgundy wine",
    "Aged meats": "Charcuterie",
    "Belgian Ale": "Belgian beer",
    "Burgundy": "Burgundy wine",
    "Chablis": "Chablis wine",
    "Crackers": "Cracker (food)",
    "Crusty bread": "Bread",
    "Cured meats": "Charcuterie",
    "Dark bread": "Rye bread",
    "Dark chocolate": "Dark chocolate",
    "Dried fruits": "Dried fruit",
    "Dry Rosé": "Rosé",
    "Fresh fruits": "Fruit",
    "Fresh herbs": "Herb",
    "Fresh melon": "Melon",
    "Grilled vegetables": "Grilling",
    "Late Harvest Riesling": "Late harvest wine",
    "Light crackers": "Cracker (food)",
    "Olive oil drizzle": "Olive oil",
    "Pickled onions": "Pickled onion",
    "Port": "Port wine",
    "Rye bread": "Rye bread",
    "Green apples": "Granny Smith",
    "Mustard": "Mustard (condiment)",
    "Sauternes": "Sauternes (wine)",
}


def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}


def save_json(filepath, data):
    with open(filepath, "w") as f:
        json.dump(data, f, indent=4)


def fetch_info(item_name):
    query = SEARCH_HINTS.get(item_name, item_name)
    try:
        url = WIKI_SUMMARY_API + quote(query)
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return None, None

        data = resp.json()
        if data.get("type") == "disambiguation":
            return None, None

        description = data.get("extract", "")
        if description:
            sentences = description.replace(". ", ".\n").split("\n")
            description = " ".join(sentences[:3]).strip()

        image = data.get("thumbnail", {}).get("source")
        if not image:
            image = data.get("originalimage", {}).get("source")

        wiki_url = data.get("content_urls", {}).get("desktop", {}).get("page")

        return description or None, image, wiki_url

    except Exception as e:
        print(f"  ! Error fetching {item_name}: {e}")
        return None, None, None


# -- MAIN --
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

items = set()
for d in data:
    for p in d.get("pairings", []):
        items.add(p)

print(f"Found {len(items)} unique pairing items")

cache = load_json(CACHE_FILE)
result = {}

for i, item in enumerate(sorted(items), start=1):
    if item in cache:
        result[item] = cache[item]
    else:
        print(f"[{i}/{len(items)}] Fetching: {item}...")
        desc, img, wiki_url = fetch_info(item)
        entry = {"description": desc, "image": img, "wiki": wiki_url}
        result[item] = entry
        cache[item] = entry
        save_json(CACHE_FILE, cache)
        time.sleep(1)

save_json(OUTPUT_FILE, result)

hits = sum(1 for v in result.values() if v.get("description"))
imgs = sum(1 for v in result.values() if v.get("image"))
print(f"\nDone! {hits}/{len(result)} with descriptions, {imgs}/{len(result)} with images.")
print(f"Output: {OUTPUT_FILE}")