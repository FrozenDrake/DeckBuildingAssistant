# GameTora Data Pipeline

This directory contains the data ingestion and preprocessing pipeline for the Deck Building Assistant. It relies on [GameTora](https://gametora.com) as the primary data source for Umamusume support cards.

## Overview

The pipeline consists of two primary scripts:
1. `gametora_scraper.py`: Fetches the latest dynamic file hashes from GameTora's manifest, downloads the raw JSON datasets, and concurrently fetches all full-art card images.
2. `preprocess_deck_builder.py`: Transforms the highly normalized and optimized GameTora data structures into a flat, denormalized schema optimized for the Deck Builder's frontend filtering engine.

## Design Decisions

### 1. Static JSON Endpoints over HTML Scraping
Rather than scraping GameTora's web pages, the scraper hooks directly into GameTora's static JSON endpoints (e.g., `manifests/umamusume.json`). 
- **Resiliency:** JSON schema changes less frequently than HTML layouts.
- **Completeness:** Provides access to backend IDs, event reward codes, and skill preconditions that might not be visibly rendered on the HTML pages.

### 2. Flattened Limit Break Structure
Umamusume handles card levels through a "Limit Break" system, where an SR at Max Limit Break (Lv 45) might be strictly better than an SSR at 0 Limit Break (Lv 30). 
- **Decision:** Instead of building game-specific comparison logic into the frontend, the preprocessor evaluates the card's effect table at every 5-level milestone and outputs a flattened `levels` array. 
- **Benefit:** The frontend application remains completely agnostic to Umamusume's gacha mechanics. It simply sees variations of a card and can universally filter them (e.g., "Show me any card variation where level >= 30 and Friendship Bonus >= 20").

### 3. "Keys as Values" Effect Mapping
Raw GameTora effect arrays are structured positionally with missing values denoted as `-1` (e.g., `[effect_id, init, lv5, lv10...]`). 
- **Decision:** The preprocessor dynamically backfills missing values and pivots the data into a dictionary where the *Effect Name* is the key: `{ "Friendship Bonus": 35, "Starting Bond Gauge": 30 }`.
- **Benefit:** Enables O(1) lookups in the UI and makes building dynamic filter checkboxes incredibly simple. The frontend doesn't need to know what a "Friendship Bonus" is; it just checks if the key exists and meets a threshold.

### 4. Denormalized Events and Skills
Raw data distributes skill definitions and event rewards across several files (`skills.json`, `training_events_ssr.json`, `dict/evrew.json`).
- **Decision:** The preprocessor performs all the "joins" ahead of time. It parses the encoded `evrew` strings (e.g., `['pt', '+10']` becomes `"Skill Points": "+10"`) and embeds the skills and trigger conditions directly into the card object.
- **Benefit:** The application backend/frontend doesn't need a relational database or complex GraphQL resolvers to display a card. `cards.json` acts as a complete, self-contained document database.

## Usage

**1. Scrape latest data and images**
```bash
python gametora_scraper.py
```
*Outputs raw JSON to `../../public/data/raw/` and images to `../../public/data/assets/supportcard/`.*

**2. Preprocess data for the Deck Builder**
```bash
python preprocess_deck_builder.py
```
*Outputs the final transformed JSON to `../../public/data/cards.json`.*

