"""
preprocess_deck_builder.py

Reads raw GameTora JSON dumps from public/data/raw/ and outputs a clean
cards.json to public/data/ suitable for direct upload via the Sync Database tab.

Changes from original:
  - rarity is now a string ("R", "SR", "SSR") instead of an int.
  - name is a single combined field ("[Title] CharName") — no separate name_en/title_en.
  - Effect names use name_en_eon > name_en > name_ja priority so no Japanese leaks through.
  - Trigger condition strings (e.g. "running_style==4&phase_random==1") are parsed into
    a structured list of { variable, operator, value } objects so they can be filtered on.
"""
import json
import re
from pathlib import Path

BASE_DIR   = Path(__file__).resolve().parent.parent.parent
DATA_DIR   = BASE_DIR / 'public' / 'data'
RAW_DIR    = DATA_DIR / 'raw'
OUTPUT_FILE = DATA_DIR / 'cards.json'

RARITY_MAP = {1: 'R', 2: 'SR', 3: 'SSR'}

# Condition variable -> human-readable label map for clarity in the UI
CONDITION_LABEL_MAP = {
    'running_style':     'Running Style',
    'phase':             'Phase',
    'phase_random':      'Phase (random)',
    'corner':            'Corner',
    'corner_random':     'Corner (random)',
    'distance_type':     'Distance Type',
    'distance_rate':     'Distance Rate',
    'distance_rate_after_random': 'Distance Rate After (random)',
    'distance_diff_rate':'Distance Diff Rate',
    'distance_diff_top': 'Distance Diff Top',
    'ground_condition':  'Ground Condition',
    'ground_type':       'Ground Type',
    'hp_per':            'HP Percent',
    'order':             'Order',
    'order_rate':        'Order Rate',
    'is_lastspurt':      'Last Spurt',
    'is_finalcorner':    'Final Corner',
    'is_finalcorner_random': 'Final Corner (random)',
    'is_last_straight':  'Last Straight',
    'is_badstart':       'Bad Start',
    'is_behind_in':      'Behind',
    'is_overtake':       'Overtake',
    'is_surrounded':     'Surrounded',
    'is_temptation':     'Temptation',
    'weather':           'Weather',
    'season':            'Season',
    'slope':             'Slope',
    'rotation':          'Rotation',
    'popularity':        'Popularity',
    'remain_distance':   'Remain Distance',
    'always':            'Always',
}

OPERATOR_RE = re.compile(r'([a-z_]+)(==|!=|>=|<=|>|<)(\S+)')


def load_json(name):
    path = RAW_DIR / name
    if not path.exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_levels_for_rarity(rarity_int):
    """Return the list of card levels for the given numeric rarity."""
    if rarity_int == 3:   return [30, 35, 40, 45, 50]
    elif rarity_int == 2: return [25, 30, 35, 40, 45]
    elif rarity_int == 1: return [20, 25, 30, 35, 40]
    return [30, 35, 40, 45, 50]


def parse_condition_string(cond_str):
    """
    Parse a condition string like "running_style==4&phase_random==1@corner==0"
    Returns a dictionary mapping variables to lists of their valid values,
    e.g. {'running_style': [4], 'phase_random': [1], 'corner': [0]}
    """
    parts = re.split(r'[&@]', cond_str)
    cond_dict = {}
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = OPERATOR_RE.match(part)
        if m:
            var, op, val = m.group(1), m.group(2), m.group(3)
            # Coerce numeric values
            try:    val = int(val)
            except ValueError:
                try: val = float(val)
                except ValueError: pass
            
            if var not in cond_dict:
                cond_dict[var] = []
            cond_dict[var].append(val)
        elif part == 'always':
            if 'always' not in cond_dict:
                cond_dict['always'] = []
            cond_dict['always'].append(1)
    return cond_dict


def resolve_effect_array(eff_array, levels):
    """
    Map a raw GameTora effect array [id, v0, v5, v10, ..., v50] to
    per-level values, forward-filling -1 (missing) entries.
    """
    eid  = eff_array[0]
    vals = eff_array[1:]   # 11 values: init, 5, 10, ..., 50

    filled = []
    current = 0
    for v in vals:
        if v != -1:
            current = v
        filled.append(current)

    resolved = {}
    for lvl in levels:
        idx = lvl // 5
        if idx < len(filled):
            resolved[lvl] = filled[idx]
    return eid, resolved


EVREW_MAP = {
    'sp': 'Speed',      'st': 'Stamina',     'pw': 'Power',
    'po': 'Power',      'gu': 'Guts',         'wi': 'Intelligence',
    'in': 'Intelligence','mo': 'Motivation',  'en': 'Energy',
    'pt': 'Skill Points','bo': 'Bond',        'sk': 'Skill Hint',
    'hp': 'Max Energy', 'ch': 'Status Effect'
}


def main():
    print("Loading raw datasets...")
    cards_raw   = load_json('support-cards.json')
    effects_raw = load_json('support_effects.json')
    skills_raw  = load_json('skills.json')
    evrew_raw   = load_json('dict_evrew.json')

    if not cards_raw:
        print("Missing support-cards.json — run gametora_scraper.py first.")
        return

    # Effect ID -> English name map.
    # Priority: name_en_eon > name_en > name_ja (last resort only, flags untranslated entries)
    effect_name_map = {}
    if effects_raw:
        for e in effects_raw:
            name = (e.get('name_en_eon') or e.get('name_en') or e.get('name_ja') or str(e['id']))
            effect_name_map[e['id']] = name

    # Skill ID -> metadata map
    skill_map = {}
    if skills_raw:
        for s in skills_raw:
            sid = s.get('id')
            if not sid:
                continue
            raw_conditions = [
                g.get('condition') for g in s.get('condition_groups', []) if g.get('condition')
            ]
            # Parse each compound condition string into structured objects
            merged_conditions = {}
            for cond_str in raw_conditions:
                cond_dict = parse_condition_string(cond_str)
                for k, v in cond_dict.items():
                    if k not in merged_conditions:
                        merged_conditions[k] = []
                    merged_conditions[k].extend(v)
            
            # Deduplicate values
            for k in merged_conditions:
                merged_conditions[k] = list(set(merged_conditions[k]))

            skill_map[sid] = {
                'name_en':        s.get('name_en') or s.get('enname') or s.get('name_ja', ''),
                'description_en': s.get('desc_en') or s.get('endesc') or s.get('desc_ja', ''),
                'trigger_conditions': merged_conditions,
            }

    # Load training events (merged from per-rarity files)
    events_raw = {}
    for fname in ['training_events_ssr.json', 'training_events_sr.json',
                  'training_events_friend.json', 'training_events_group.json']:
        data = load_json(fname)
        if data and isinstance(data, dict):
            events_raw.update({str(k): v for k, v in data.items()})
        elif data and isinstance(data, list):
            for item in data:
                if len(item) >= 2:
                    events_raw[str(item[0])] = item[1]

    out_cards = []

    for c in cards_raw:
        cid = c.get('id') or c.get('support_id')
        if not cid:
            continue

        rarity_int = c.get('rarity', 1)
        rarity_str = RARITY_MAP.get(rarity_int, str(rarity_int))
        levels     = get_levels_for_rarity(rarity_int)

        # Single combined name field: "[Title] CharName"
        # Falls back to Japanese title when English title is not yet available,
        # so cards without translated titles still get unique names.
        char_name = c.get('char_name', '').strip()
        title     = (c.get('title_en') or c.get('title_ja') or '').strip()
        name      = f"{title} {char_name}".strip() if title else char_name

        c_out = {
            'id':            cid,
            'name':          name,
            'rarity':        rarity_str,
            'type':          c.get('type', ''),
            'obtained':      c.get('obtained', ''),
            'release':       c.get('release', ''),
            'release_en':    c.get('release_en', ''),
            'characters':    [char_name] if char_name else [],
            'unique_effect': None,
            'levels':        [],
            'skills':        [],
            'events':        [],
        }

        # Build per-level effect dicts
        level_effects = {lvl: {} for lvl in levels}
        for eff in c.get('effects', []):
            eid, resolved_vals = resolve_effect_array(eff, levels)
            ename = effect_name_map.get(eid, str(eid))
            for lvl in levels:
                val = resolved_vals.get(lvl, 0)
                if val != 0:
                    level_effects[lvl][ename] = val

        for idx, lvl in enumerate(levels):
            c_out['levels'].append({
                'level':       lvl,
                'limit_break': idx,
                'effects':     level_effects[lvl],
            })

        # Unique effect (SSR-only, typically unlocks at 0LB / level 30)
        unique = c.get('unique_effect')
        if unique:
            c_out['unique_effect'] = {
                'level':       unique.get('level', levels[0]),
                'description': unique.get('description_en') or unique.get('description_ja', ''),
            }

        # Skills — hint skills first, then event skills
        hints = c.get('hints', {})
        if isinstance(hints, dict):
            for sid in hints.get('hint_skills', []):
                sm = skill_map.get(sid)
                if sm:
                    c_out['skills'].append({
                        'id':                sid,
                        'name_en':           sm['name_en'],
                        'description_en':    sm['description_en'],
                        'is_hint':           True,
                        'is_event':          False,
                        'trigger_conditions': sm['trigger_conditions'],
                    })

        for sid in c.get('event_skills', []):
            sm = skill_map.get(sid)
            if sm:
                c_out['skills'].append({
                    'id':                sid,
                    'name_en':           sm['name_en'],
                    'description_en':    sm['description_en'],
                    'is_hint':           False,
                    'is_event':          True,
                    'trigger_conditions': sm['trigger_conditions'],
                })

        # Training events
        card_events = events_raw.get(str(cid), [])
        for ev in card_events:
            if not (isinstance(ev, list) and len(ev) >= 2 and isinstance(ev[1], list)):
                continue
            ev_out = {'name': f"Event_{ev[0]}", 'choices': []}
            for choice in ev[1]:
                if len(choice) >= 2 and isinstance(choice[1], list):
                    choice_out = {'effects': {}}
                    for eff_id in choice[1]:
                        if isinstance(eff_id, int) and evrew_raw and eff_id < len(evrew_raw):
                            try:
                                reward = evrew_raw[eff_id]
                            except (IndexError, TypeError):
                                reward = None
                            if reward and isinstance(reward, list):
                                r_name = EVREW_MAP.get(reward[0], reward[0])
                                r_val  = reward[1] if len(reward) > 1 else ''
                                choice_out['effects'][r_name] = r_val
                    ev_out['choices'].append(choice_out)
            c_out['events'].append(ev_out)

        out_cards.append(c_out)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(out_cards, f, ensure_ascii=False, indent=2)

    print(f"Done — {len(out_cards)} cards written to {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
