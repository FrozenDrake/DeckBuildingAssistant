import json

with open('public/data/cards.json', 'r') as f:
    cards = json.load(f)

for card in cards:
    if 'name' in card and ']' in card['name']:
        char_name = card['name'].split(']', 1)[1].strip()
        if char_name:
            card['characters'] = [char_name]

    if 'skills' in card:
        for skill in card['skills']:
            if 'trigger_conditions' in skill and isinstance(skill['trigger_conditions'], list):
                new_conds = {}
                is_obj_array = False
                for tc in skill['trigger_conditions']:
                    if isinstance(tc, dict) and 'variable' in tc:
                        is_obj_array = True
                        var = tc['variable']
                        val = tc['value']
                        if var not in new_conds:
                            new_conds[var] = []
                        if val not in new_conds[var]:
                            new_conds[var].append(val)
                
                if is_obj_array:
                    # Simplify single-item arrays
                    for k, v in new_conds.items():
                        if len(v) == 1:
                            new_conds[k] = v[0]
                    skill['trigger_conditions'] = new_conds

with open('public/data/cards.json', 'w') as f:
    json.dump(cards, f, indent=2)

print('Rewrote cards.json')
