import requests
from bs4 import BeautifulSoup
import json
import os
import time
from pathlib import Path

# - CONFIG -
BASE_DIR = Path(__file__).parent.parent
INPUT_FILE  = BASE_DIR/"data"/"processed"/"cheeses_clean_geo.json"
CACHE_FILE = BASE_DIR/"data"/"processed"/"img_cache.json"
OUTPUT_FILE = BASE_DIR/"data"/"processed"/"final_cheeses.json"

#make sure output folder exists
OUTPUT_FILE.parent.parent.mkdir(parents=True, exist_ok=True)

def load_json(filepath):
    #load/initialize cache 
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            try: return json.load(f)
            except: return {}
    return {}

def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4) #indent=4 pretty-prints with newlines

def scrape(url):
    #scrape the cheese image from its cheese.com page
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            #cheese images are in /media/img/ paths
            img_tag = soup.find("img", src=lambda s: s and "/media/img/" in s)

            if img_tag and img_tag.get('src'):
                img_src = img_tag['src']
                #convert relative path to absolute URL
                if img_src.startswith('/'):
                    img_src = "https://www.cheese.com" + img_src
                return img_src
    except Exception as e:
        print(f"  ! Error scraping {url}: {e}")

    return None


# -- MAIN --
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

#load cache so we don't re-scrape on restart
img_cache = load_json(CACHE_FILE)

result = []
for i, entry in enumerate(data, start=1):
    url = entry.get("url", "")
    cheese_name = entry.get("cheese", "unknown")

    #check cache first
    if url in img_cache:
        img_url = img_cache[url]
    else:
        print(f"[{i}/{len(data)}] Scraping: {cheese_name}...")
        img_url = scrape(url)
        img_cache[url] = img_url
        #save cache after every new fetch in case of crash
        save_json(CACHE_FILE, img_cache)
        time.sleep(1)

    new_entry = {**entry, "image": img_url}
    result.append(new_entry)

#save final output
save_json(OUTPUT_FILE, result)

print(f"Done! {len(result)} cheeses written to '{OUTPUT_FILE}'.")

