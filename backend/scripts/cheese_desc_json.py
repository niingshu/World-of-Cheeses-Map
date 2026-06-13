import requests
import json
import os
import time
import re
import html as html_mod
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
CACHE_FILE = BASE_DIR / "data" / "processed" / "desc_cache.json"
WIKI_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
WIKI_ACTION_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "CheeseMapBot/1.0 (shuning010506@gmail.com)"}


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


def strip_html(raw):
    raw = re.sub(r"<style[^>]*>.*?</style>", "", raw, flags=re.DOTALL)
    raw = re.sub(r"<script[^>]*>.*?</script>", "", raw, flags=re.DOTALL)
    raw = re.sub(r"<ref[^>]*>.*?</ref>", "", raw, flags=re.DOTALL)
    raw = re.sub(r"<ref[^>]*/>", "", raw)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = html_mod.unescape(raw)
    raw = re.sub(r"\[.*?\]", "", raw)
    raw = re.sub(r"Main article:.*?(?=\s[A-Z])", "", raw)
    raw = re.sub(r"Cite error:[^\^]*", "", raw)
    raw = re.sub(r"\s*\^ .*", "", raw, flags=re.DOTALL)
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw


def try_summary(query, cheese_name):
    try:
        url = WIKI_SUMMARY_API + quote(query)
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return None

        summary_data = resp.json()
        if summary_data.get("type", "") == "disambiguation":
            return None

        description = summary_data.get("extract", "")
        if not description:
            return None

        cheese_lower = cheese_name.lower()
        desc_lower = description.lower()
        if "cheese" not in desc_lower and cheese_lower not in desc_lower:
            return None

        return summary_data
    except Exception as e:
        print(f"  ! Error fetching Wikipedia for {query}: {e}")
        return None


def resolve_page(cheese_name):
    for query in [cheese_name + " cheese", cheese_name]:
        summary_data = try_summary(query, cheese_name)
        if summary_data:
            return summary_data
        time.sleep(0.5)
    return None


def fetch_cheese_info(cheese_name):
    summary_data = resolve_page(cheese_name)
    if not summary_data:
        return None, None, None

    description = summary_data.get("extract", "")
    page_title = summary_data.get("titles", {}).get("canonical", cheese_name)
    time.sleep(1)
    manufacture = fetch_manufacture_section(page_title)

    return description, manufacture, page_title


def fetch_manufacture_section(page_title):
    try:
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "sections",
            "format": "json",
        }
        resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            print(f"  ! Sections API returned {resp.status_code} for {page_title}")
            return None

        try:
            data = resp.json()
        except Exception:
            print(f"  ! Rate limited on sections for {page_title}, retrying...")
            time.sleep(5)
            resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
            data = resp.json()

        sections = data.get("parse", {}).get("sections", [])

        manufacture_keywords = {"manufacture", "manufacturing", "production", "process", "making"}
        target_index = None
        for section in sections:
            heading = strip_html(section.get("line", "")).lower().strip()
            if heading in manufacture_keywords and section.get("toclevel") == 1:
                target_index = section.get("index")
                break

        if not target_index:
            return None

        time.sleep(1)

        params = {
            "action": "parse",
            "page": page_title,
            "section": target_index,
            "prop": "text",
            "format": "json",
        }
        resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            print(f"  ! Text API returned {resp.status_code} for {page_title}")
            return None

        try:
            data = resp.json()
        except Exception:
            print(f"  ! Rate limited on text for {page_title}, retrying...")
            time.sleep(5)
            resp = requests.get(WIKI_ACTION_API, params=params, headers=HEADERS, timeout=10)
            data = resp.json()

        raw_html = data.get("parse", {}).get("text", {}).get("*", "")
        text = strip_html(raw_html)
        if len(text) > 30:
            return text

        return None

    except Exception as e:
        print(f"  ! Error fetching manufacture section for {page_title}: {e}")
        return None


# -- MAIN --
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

cache = load_json(CACHE_FILE)

result = []
hits = 0
for i, entry in enumerate(data, start=1):
    cheese_name = entry.get("cheese", "unknown")

    if cheese_name in cache:
        cached = cache[cheese_name]
        desc = cached.get("description")
        hist = cached.get("manufacture")

        if desc and not hist and "manufacture_checked" not in cached:
            print(f"[{i}/{len(data)}] Re-fetching manufacture: {cheese_name}...")
            page_title = cached.get("page_title")
            if not page_title:
                sd = resolve_page(cheese_name)
                page_title = sd.get("titles", {}).get("canonical") if sd else None
                time.sleep(0.5)

            if page_title:
                hist = fetch_manufacture_section(page_title)
                cache[cheese_name]["manufacture"] = hist
                cache[cheese_name]["page_title"] = page_title
            cache[cheese_name]["manufacture_checked"] = True
            save_json(CACHE_FILE, cache)
            time.sleep(1)
    else:
        print(f"[{i}/{len(data)}] Fetching Wikipedia: {cheese_name}...")
        desc, hist, page_title = fetch_cheese_info(cheese_name)
        cache[cheese_name] = {
            "description": desc,
            "manufacture": hist,
            "page_title": page_title,
            "manufacture_checked": True,
        }
        save_json(CACHE_FILE, cache)
        time.sleep(1)

    new_entry = {**entry}
    if desc:
        new_entry["description"] = desc
        hits += 1
    if hist:
        new_entry["manufacture"] = hist

    result.append(new_entry)

save_json(OUTPUT_FILE, result)

print(f"\nDone! {hits}/{len(result)} cheeses got descriptions.")
print(f"Output: {OUTPUT_FILE}")
