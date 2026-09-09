import json
from pathlib import Path

BASE_DIR = Path('E:/codeProjects/DeckBuildingAssistant/public/data')
RAW_DIR = BASE_DIR / 'raw'

with open(RAW_DIR / 'support-cards.json', 'r', encoding='utf-8') as f:
    cards = json.load(f)

with open(RAW_DIR / 'support_effects.json', 'r', encoding='utf-8') as f:
    effects_raw = json.load(f)

with open(RAW_DIR / 'skills.json', 'r', encoding='utf-8') as f:
    skills_raw = json.load(f)

effect_map = { e['id']: e.get('name_en', e.get('name_ja')) for e in effects_raw }

for c in cards:
    if c.get('char_id') == 1001 and c.get('rarity') == 3: # SSR Special Week
        print(f"Found {c['name_en']}")
        print(f"Effects: {c['effects']}")
        for eff in c['effects']:
            eid = eff[0]
            print(f"  {effect_map.get(eid)}: {eff}")
        break

