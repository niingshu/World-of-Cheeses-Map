import json
from pathlib import Path

# - CONFIG - 
BASE_DIR = Path(__file__).parent #resolve paths relative to this script location
INPUT_FILE  = BASE_DIR/"raw"/"cheeses.json"
OUTPUT_FILE = BASE_DIR/"processed"/"cheeses_clean_no_pos.json"

#make sure output folder exists
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

# fields to delete
FIELDS_TO_REMOVE = {
    "family",
    "fat_content",
    "calcium_content",
    "rind",
    "aroma",
    "vegetarian",
    "vegan",
    "synonyms",
    "alt_spellings",
    "producers",
}

#-- 
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)
 
cleaned = []
for i, entry in enumerate(data, start=1): #create a counter
    # remove unwanted fields
    new_entry = {k: v for k, v in entry.items() if k not in FIELDS_TO_REMOVE}
    # add id at the front
    # python trick, create new dict starting with id
    new_entry = {"id": i, **new_entry}
    cleaned.append(new_entry)
 
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(cleaned, f, indent=2, ensure_ascii=False)
 
print(f"Done! {len(cleaned)} entries written to '{OUTPUT_FILE}'")