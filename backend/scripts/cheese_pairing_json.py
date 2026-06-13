import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "final_cheeses.json"
SCRAPED_CACHE = BASE_DIR / "data" / "processed" / "pairing_cache.json"

WINE_BY_TYPE = {
    "soft": ["Champagne", "Chardonnay", "Sauvignon Blanc"],
    "semi-soft": ["Pinot Noir", "Riesling", "Beaujolais"],
    "semi-hard": ["Merlot", "Chianti", "Zinfandel"],
    "semi-firm": ["Merlot", "Chianti", "Zinfandel"],
    "hard": ["Cabernet Sauvignon", "Aged Bordeaux", "Barolo"],
    "firm": ["Cabernet Sauvignon", "Tempranillo", "Malbec"],
    "fresh soft": ["Prosecco", "Sauvignon Blanc", "Pinot Grigio"],
    "fresh firm": ["Pinot Grigio", "Albariño", "Verdejo"],
    "blue-veined": ["Port", "Sauternes", "Late Harvest Riesling"],
    "soft-ripened": ["Champagne", "Burgundy", "Chablis"],
    "smear-ripened": ["Gewürztraminer", "Riesling", "Belgian Ale"],
    "brined": ["Sauvignon Blanc", "Assyrtiko", "Dry Rosé"],
}

FOOD_BY_TYPE = {
    "soft": ["Fresh fruits", "Baguette", "Light crackers"],
    "semi-soft": ["Pears", "Honey", "Prosciutto"],
    "semi-hard": ["Cured meats", "Dark bread", "Olives"],
    "semi-firm": ["Cured meats", "Dark bread", "Olives"],
    "hard": ["Aged meats", "Dark chocolate", "Dried fruits"],
    "firm": ["Aged meats", "Dried fruits", "Crusty bread"],
    "fresh soft": ["Tomatoes", "Basil", "Olive oil drizzle"],
    "fresh firm": ["Grilled vegetables", "Crusty bread"],
    "blue-veined": ["Walnuts", "Honey", "Figs"],
    "soft-ripened": ["Baguette", "Fig jam", "Grapes"],
    "smear-ripened": ["Rye bread", "Pickled onions", "Mustard"],
    "brined": ["Watermelon", "Olives", "Fresh herbs"],
}

WINE_BY_FLAVOR = {
    "nutty": ["Sherry", "Aged Burgundy"],
    "sweet": ["Moscato", "Riesling"],
    "sharp": ["Cabernet Sauvignon", "Syrah"],
    "strong": ["Port", "Barolo"],
    "smokey": ["Malbec", "Zinfandel"],
    "spicy": ["Gewürztraminer", "Syrah"],
    "creamy": ["Chardonnay", "Champagne"],
    "tangy": ["Sauvignon Blanc", "Pinot Grigio"],
    "mild": ["Pinot Grigio", "Prosecco"],
    "earthy": ["Pinot Noir", "Côtes du Rhône"],
    "fruity": ["Rosé", "Beaujolais"],
    "buttery": ["Oaked Chardonnay", "Viognier"],
    "salty": ["Champagne", "Dry Riesling"],
    "pungent": ["Gewürztraminer", "Amber Ale"],
    "mushroomy": ["Pinot Noir", "Nebbiolo"],
    "herbaceous": ["Sauvignon Blanc", "Grüner Veltliner"],
}

FOOD_BY_FLAVOR = {
    "nutty": ["Almonds", "Walnuts"],
    "sweet": ["Honey", "Fresh berries"],
    "sharp": ["Cured meats", "Cornichons"],
    "strong": ["Dark chocolate", "Hearty bread"],
    "smokey": ["Smoked meats", "Roasted nuts"],
    "spicy": ["Chutney", "Dried apricots"],
    "creamy": ["Fresh fruits", "Crackers"],
    "tangy": ["Green apples", "Sourdough"],
    "mild": ["Grapes", "Crackers"],
    "earthy": ["Mushrooms", "Roasted garlic"],
    "fruity": ["Fresh pears", "Grapes"],
    "buttery": ["Baguette", "Roasted nuts"],
    "salty": ["Fresh melon", "Olives"],
    "pungent": ["Crusty bread", "Quince paste"],
    "mushroomy": ["Truffle honey", "Crostini"],
    "herbaceous": ["Fresh herbs", "Olive oil"],
}

WINE_BY_MILK = {
    "goat": ["Sancerre", "Sauvignon Blanc"],
    "sheep": ["Tempranillo", "Rioja"],
    "buffalo": ["Pinot Grigio", "Vermentino"],
    "water buffalo": ["Pinot Grigio", "Vermentino"],
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


def parse_csv(value):
    if not value or value in ("NA", "N/A"):
        return []
    return [v.strip().lower() for v in value.split(",")]


def generate_pairings(entry):
    wines = []
    foods = []

    types = parse_csv(entry.get("type", ""))
    flavors = parse_csv(entry.get("flavor", ""))
    milk = parse_csv(entry.get("milk", ""))

    priority = ["blue-veined", "soft-ripened", "smear-ripened", "brined"]
    sorted_types = sorted(types, key=lambda t: 0 if t in priority else 1)
    for t in sorted_types:
        wines.extend(WINE_BY_TYPE.get(t, []))
        foods.extend(FOOD_BY_TYPE.get(t, []))

    for f in flavors:
        wines.extend(WINE_BY_FLAVOR.get(f, []))
        foods.extend(FOOD_BY_FLAVOR.get(f, []))

    for m in milk:
        wines.extend(WINE_BY_MILK.get(m, []))

    seen_wines = set()
    unique_wines = []
    for w in wines:
        if w.lower() not in seen_wines:
            seen_wines.add(w.lower())
            unique_wines.append(w)

    seen_foods = set()
    unique_foods = []
    for f in foods:
        if f.lower() not in seen_foods:
            seen_foods.add(f.lower())
            unique_foods.append(f)

    result = []
    for w in unique_wines[:3]:
        result.append(w)
    for f in unique_foods[:3]:
        result.append(f)

    return result if result else None


# -- MAIN --
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

scraped = load_json(SCRAPED_CACHE)

result = []
hits = 0
for entry in data:
    url = entry.get("url", "")
    scraped_pairings = scraped.get(url)

    if scraped_pairings:
        pairings = scraped_pairings
    else:
        pairings = generate_pairings(entry)

    new_entry = {**entry}
    if pairings:
        new_entry["pairings"] = pairings
        hits += 1

    result.append(new_entry)

save_json(OUTPUT_FILE, result)

print(f"Done! {hits}/{len(result)} cheeses got pairings.")
print(f"Output: {OUTPUT_FILE}")
