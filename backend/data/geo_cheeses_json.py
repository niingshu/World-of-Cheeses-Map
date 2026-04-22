#fetch coordinates of cheeses & dictionary-based cache
import json 
import os 
from pathlib import Path
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# - CONFIG - 
BASE_DIR = Path(__file__).parent #resolve paths relative to this script location
INPUT_FILE  = BASE_DIR/"processed"/"cheeses_clean_no_loc.json"
CACHE_FILE = BASE_DIR/"processed"/"geo_cache.json"
OUTPUT_FILE = BASE_DIR/"processed"/"cheeses_clean_geo.json"

#make sure output folder exists
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

#load/initialize cache 
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "r") as f:
        geo_cache = json.load(f)
else:
    geo_cache = {}

#set up geocoder (notinatim)
geolocator = Nominatim(user_agent="cheese_explorer_v1")
#ratelimiter automatically adds the 1-second delay for you
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

cleaned = []
for i,entry in enumerate(data, start=1):
    region = entry.get("region", "")
    country_raw = entry.get("country", "")
    country = country_raw.split(",")[0].strip()
    search_query = country if region in ("NA", "", "N/A", "+") else f"{region}, {country}"

    #check if in cache first 
    if search_query in geo_cache:
        lat,lon = geo_cache[search_query]
    else: 
        print(f"Fetching: {search_query}...")
        location = geocode(search_query)
        if location:
            lat, lon = location.latitude, location.longitude
        else:
            lat, lon = None, None

        #save to cache dict
        geo_cache[search_query] = [lat,lon]
        #save after every new fetch, so can backup when crash
        with open(CACHE_FILE, "w") as f:
            json.dump(geo_cache, f)
    
    new_entry = {"id": entry["id"], "lat": lat, "lon": lon,
             **{k: v for k, v in entry.items() if k != "id"}} #make a new, ** copy rest over
    cleaned.append(new_entry)

#save 
with open(OUTPUT_FILE, "w", encoding="utf-8") as f: # "w" = overwrite
    json.dump(cleaned, f, indent=2, ensure_ascii=False)

with open(CACHE_FILE, "w") as f: # "w" = overwrite
    json.dump(geo_cache, f)

print(f"Done! Processed {len(cleaned)} cheeses.")