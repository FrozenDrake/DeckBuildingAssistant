import os
import json

# This assumes we already have cards.json ready, let's just use it to generate mongo updates
with open('public/data/cards.json', 'r') as f:
    cards = json.load(f)

print("Updates prepared")
