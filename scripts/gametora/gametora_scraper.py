import os
import sys
import json
import requests
import concurrent.futures
from pathlib import Path

# Paths relative to the script
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / 'public' / 'data'
RAW_DIR = DATA_DIR / 'raw'
ASSETS_DIR = DATA_DIR / 'assets' / 'supportcard'

RAW_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_URL = "https://gametora.com/data/manifests/umamusume.json"
BASE_DATA_URL = "https://gametora.com/data/umamusume"
IMAGE_URL_TEMPLATE = "https://gametora.com/images/umamusume/supports/tex_support_card_{id}.png"

TARGET_KEYS = [
    'support-cards',
    'support_effects',
    'skills',
    'training_events/ssr',
    'training_events/sr',
    'training_events/friend',
    'training_events/group',
    'dict/evrew',
    'dict/choice_texts_ja',
]

def fetch_json(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def download_image(card_id, url, dest_path):
    if dest_path.exists():
        return False # Skipped
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(dest_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            pass
    except Exception as e:
        print(f"Error downloading {card_id}: {e}")
    return False

def main():
    print("Fetching manifest...")
    manifest = fetch_json(MANIFEST_URL)
    
    # Download JSON datasets
    print("Downloading raw JSON datasets...")
    for key in TARGET_KEYS:
        if key in manifest:
            hash_val = manifest[key]
            url = f"{BASE_DATA_URL}/{key}.{hash_val}.json"
            print(f"  Fetching {key}...")
            try:
                data = fetch_json(url)
                # save to raw dir
                safe_name = key.replace('/', '_') + '.json'
                with open(RAW_DIR / safe_name, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"  Failed to fetch {key}: {e}")
        else:
            print(f"  Skipping {key} (not found in manifest)")

    # Parse support cards for IDs to download images
    cards_path = RAW_DIR / 'support-cards.json'
    if not cards_path.exists():
        print("support-cards.json not found, aborting image download.")
        return

    with open(cards_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)

    card_ids = []
    if isinstance(cards, list):
        for c in cards:
            cid = c.get('id') or c.get('support_id')
            if cid:
                card_ids.append(cid)
    elif isinstance(cards, dict):
        card_ids = list(cards.keys())

    card_ids = list(set(card_ids)) # unique
    print(f"Found {len(card_ids)} unique cards. Downloading images...")
    
    downloaded = 0
    skipped = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for cid in card_ids:
            url = IMAGE_URL_TEMPLATE.format(id=cid)
            dest = ASSETS_DIR / f"{cid}.png"
            futures[executor.submit(download_image, cid, url, dest)] = cid
            
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                downloaded += 1
            else:
                skipped += 1
                
    print(f"Image download complete. Downloaded: {downloaded}, Skipped: {skipped}")

if __name__ == "__main__":
    main()

