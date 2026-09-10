import pymongo
import json
client = pymongo.MongoClient()
db = client['deckbuilder']
game = db['games'].find_one({"name": "Umamusume: Pretty Derby"})
print(json.dumps(game.get('card_schema', []), indent=2))
