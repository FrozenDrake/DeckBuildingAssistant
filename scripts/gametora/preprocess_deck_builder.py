import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
RAW_DIR = DATA_DIR / 'raw'
OUTPUT_FILE = DATA_DIR / 'cards.json'

def load_json(name):
    path = RAW_DIR / name
    if not path.exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_levels_for_rarity(rarity):
    # Rarity: 1=R, 2=SR, 3=SSR
    if rarity == 3: return [30, 35, 40, 45, 50]
    elif rarity == 2: return [25, 30, 35, 40, 45]
    elif rarity == 1: return [20, 25, 30, 35, 40]
    return [30, 35, 40, 45, 50] # fallback

EVREW_MAP = {
    'sp': 'Speed',
    'st': 'Stamina',
    'pw': 'Power',
    'po': 'Power',
    'gu': 'Guts',
    'wi': 'Intelligence',
    'in': 'Intelligence',
    'mo': 'Motivation',
    'en': 'Energy',
    'pt': 'Skill Points',
    'bo': 'Bond',
    'sk': 'Skill Hint',
    'hp': 'Max Energy',
    'ch': 'Status Effect'
}

def resolve_effect_array(eff_array, levels):
    eid = eff_array[0]
    vals = eff_array[1:] # 11 values: init, 5, 10, ... 50
    
    # Forward fill missing (-1) values
    filled_vals = []
    current = 0
    for v in vals:
        if v != -1:
            current = v
        filled_vals.append(current)
        
    resolved = {}
    for i, lvl in enumerate(levels):
        idx = (lvl // 5)
        # vals[0] is init(0). vals[1] is 5. So index = lvl // 5.
        if idx < len(filled_vals):
            resolved[lvl] = filled_vals[idx]
    return eid, resolved

def main():
    print("Loading raw datasets...")
    cards_raw = load_json('support-cards.json')
    effects_raw = load_json('support_effects.json')
    skills_raw = load_json('skills.json')
    evrew_raw = load_json('dict_evrew.json')
    
    if not cards_raw:
        print("Missing support-cards.json")
        return

    # Mappings
    effect_name_map = {}
    if effects_raw:
        for e in effects_raw:
            effect_name_map[e['id']] = e.get('name_en') or e.get('name_ja') or str(e['id'])

    skill_map = {}
    if skills_raw:
        for s in skills_raw:
            sid = s.get('id')
            if sid:
                skill_map[sid] = {
                    'name_en': s.get('name_en') or s.get('enname') or s.get('name_ja', ''),
                    'description_en': s.get('desc_en') or s.get('endesc') or s.get('desc_ja', ''),
                    'trigger_conditions': [g.get('condition') for g in s.get('condition_groups', []) if g.get('condition')],
                    'preconditions': [g.get('precondition') for g in s.get('condition_groups', []) if g.get('precondition')]
                }

    # Load events
    # We'll merge ssr, sr, friend, group into one dict mapping card_id (str) to list of events
    events_raw = {}
    for k in ['training_events_ssr.json', 'training_events_sr.json', 'training_events_friend.json', 'training_events_group.json']:
        data = load_json(k)
        if data and isinstance(data, dict):
            events_raw.update({str(k): v for k, v in data.items()})
        elif data and isinstance(data, list):
            # some endpoints returned lists [ [card_id, [events]] ] 
            for item in data:
                if len(item) >= 2:
                    events_raw[str(item[0])] = item[1]

    out_cards = []
    
    for c in cards_raw:
        cid = c.get('id') or c.get('support_id')
        if not cid:
            continue
            
        rarity = c.get('rarity', 1)
        levels = get_levels_for_rarity(rarity)
        
        c_out = {
            'id': cid,
            'name_en': c.get('char_name', ''),
            'title_en': c.get('title_en', ''),
            'rarity': rarity,
            'type': c.get('type', ''),
            'obtained': c.get('obtained', ''),
            'unique_effect': None,
            'levels': [],
            'skills': [],
            'events': []
        }
        
        # Process Effects -> levels
        # We need to construct the effects at each level
        level_effects = {lvl: {} for lvl in levels}
        
        for eff in c.get('effects', []):
            eid, resolved_vals = resolve_effect_array(eff, levels)
            ename = effect_name_map.get(eid, str(eid))
            
            for lvl in levels:
                val = resolved_vals.get(lvl, 0)
                if val != 0: # Only include if it has a value
                    level_effects[lvl][ename] = val

        for idx, lvl in enumerate(levels):
            c_out['levels'].append({
                'level': lvl,
                'limit_break': idx,
                'effects': level_effects[lvl]
            })
            
        # Add Unique Effect (if present, usually starts at 0LB which is level 30 for SSR)
        unique = c.get('unique_effect')
        if unique:
            # unique has level, description, etc.
            u_lvl = unique.get('level', levels[0])
            c_out['unique_effect'] = {
                'level': u_lvl,
                'description': unique.get('description_en') or unique.get('description_ja', '')
            }

        # Process Skills
        hints = c.get('hints', {})
        if isinstance(hints, dict):
            hint_skills = hints.get('hint_skills', [])
            for sid in hint_skills:
                sm = skill_map.get(sid)
                if sm:
                    c_out['skills'].append({
                        'id': sid,
                        'name_en': sm['name_en'],
                        'description_en': sm['description_en'],
                        'is_hint': True,
                        'is_event': False,
                        'trigger_conditions': sm['trigger_conditions']
                    })
                    
        event_skills = c.get('event_skills', [])
        for sid in event_skills:
            sm = skill_map.get(sid)
            if sm:
                c_out['skills'].append({
                    'id': sid,
                    'name_en': sm['name_en'],
                    'description_en': sm['description_en'],
                    'is_hint': False,
                    'is_event': True,
                    'trigger_conditions': sm['trigger_conditions']
                })

        # Process Events
        # GameTora events structure is complex. We'll simplify.
        # evrew lookup for rewards
        card_events = events_raw.get(str(cid), [])
        if not card_events and isinstance(events_raw, dict):
            card_events = events_raw.get(cid, [])
            
        if card_events:
            for ev in card_events:
                # ev is [event_id, [choices], ... ]
                if isinstance(ev, list) and len(ev) >= 2 and isinstance(ev[1], list):
                    ev_out = {
                        'name': f"Event_{ev[0]}",
                        'choices': []
                    }
                    for choice in ev[1]:
                        if len(choice) >= 2 and isinstance(choice[1], list):
                            c_out_choice = {'effects': {}}
                            for eff_id in choice[1]:
                                if isinstance(eff_id, int):
                                    try:
                                        reward = evrew_raw[eff_id] if evrew_raw and eff_id < len(evrew_raw) else None
                                    except (ValueError, TypeError):
                                        reward = None
                                    
                                    if reward and isinstance(reward, list):
                                        r_type = reward[0]
                                        r_val = reward[1] if len(reward) > 1 else ""
                                        r_name = EVREW_MAP.get(r_type, r_type)
                                        c_out_choice['effects'][r_name] = r_val
                            ev_out['choices'].append(c_out_choice)
                    c_out['events'].append(ev_out)
                    
        out_cards.append(c_out)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(out_cards, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(out_cards)} cards into cards.json")

if __name__ == '__main__':
    main()
