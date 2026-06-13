import requests
import json
import os
import time
import re
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
DESC_CACHE = BASE_DIR / "data" / "processed" / "desc_cache.json"
IMG_CACHE_FILE = BASE_DIR / "data" / "processed" / "images_cache.json"
WIKI_ACTION_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "CheeseMapBot/1.0 (shuning010506@gmail.com)"}

SKIP_PATTERNS = re.compile(
    r"(\.svg$|commons-logo|foodlogo|wikibooks-logo|wikiquote-logo|"
    r"wikisource-logo|wiktionary-logo|wikinews-logo|wikiversity-logo|"
    r"wikivoyage-logo|wikidata-logo|mediawiki-logo|wikimedia-logo|"
    r"protection-shackle|edit-clear|question-mark|flag_of_|increase2|"
    r"decrease2|steady2|crystal_clear|nuvola|padlock|ambox|"
    r"disambig|icon|symbol|pictogram|logo|coat_of_arms|"
    r"blason|escudo|wappen|map_of_|carte_de_|location_map|"
    r"locator_map|position_map|relief_map|blank_map|"
    r"portrait|signature|autograph|stamp|medal|"
    r"folder_hexagonal|text-html|merge-arrow|"
    r"gnome-|gtk-|oxygen-|tango-)", re.IGNORECASE
)


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


def fetch_image_filenames(page_title):
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "images",
        "format": "json",
    }
    try:
        resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        data = resp.json()
        images = data.get("parse", {}).get("images", [])
        filtered = [img for img in images if not SKIP_PATTERNS.search(img)]
        return filtered
    except Exception as e:
        print(f"  ! Error fetching images for {page_title}: {e}")
        return []


def get_image_urls(filenames, width=500):
    if not filenames:
        return []

    urls = []
    for i in range(0, len(filenames), 10):
        batch = filenames[i:i+10]
        titles = "|".join(f"File:{fn}" for fn in batch)
        params = {
            "action": "query",
            "titles": titles,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": width,
            "format": "json",
        }
        try:
            resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
            if resp.status_code != 200:
                continue
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for pid, page in pages.items():
                info = page.get("imageinfo", [{}])[0]
                thumb = info.get("thumburl") or info.get("url")
                if thumb:
                    urls.append(thumb)
        except Exception as e:
            print(f"  ! Error fetching URLs for batch: {e}")

        if i + 10 < len(filenames):
            time.sleep(0.5)

    return urls


# -- MAIN --
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

desc_cache = load_json(DESC_CACHE)
img_cache = load_json(IMG_CACHE_FILE)

total = 0
hits = 0

for i, entry in enumerate(data, start=1):
    cheese_name = entry.get("cheese", "unknown")
    cached_desc = desc_cache.get(cheese_name, {})
    page_title = cached_desc.get("page_title")

    if not page_title:
        continue

    total += 1

    if cheese_name in img_cache:
        images = img_cache[cheese_name]
        if images:
            hits += 1
        continue

    print(f"[{total}/{sum(1 for c in desc_cache.values() if c.get('page_title'))}] Fetching images: {cheese_name} ({page_title})...")

    filenames = fetch_image_filenames(page_title)
    time.sleep(0.5)

    urls = get_image_urls(filenames)
    img_cache[cheese_name] = urls
    save_json(IMG_CACHE_FILE, img_cache)

    if urls:
        hits += 1
        print(f"  -> {len(urls)} images found")
    else:
        print(f"  -> no images")

    time.sleep(1)

result = []
for entry in data:
    new_entry = {**entry}
    images = img_cache.get(entry.get("cheese", ""), [])
    if images:
        new_entry["images"] = images[:8]
    result.append(new_entry)

save_json(OUTPUT_FILE, result)

print(f"\nDone! {hits}/{total} cheeses with Wikipedia images.")
print(f"Output: {OUTPUT_FILE}")
