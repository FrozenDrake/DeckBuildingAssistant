# Deck Building Assistant - Task List

- `[x]` **Phase 1: UI Polish & Core Deck Builder**
  - `[x]` Theme-Aware Scrollbars: Update `main.css` to use `::-webkit-scrollbar` pseudo-elements tied to CSS variables.
  - `[x]` Deck Builder Sorting Options: Add a sorting dropdown to the Deck Builder subheader (e.g., Sort by Rarity, Name, Type).
  - `[x]` Complex Filters Integration: Wire up the existing recursive `ComplexFilter` component into a modal or expanding tray in the Deck Builder.

- `[x]` **Phase 2: The Deck Generator (Algorithmic)**
  - `[x]` Restriction-Based Deck Generator (V1): Build a UI tool that accepts arbitrary user restrictions (e.g., "3 Speed, 2 Stamina, 1 specific card, prioritize 'Sprint' skills").
  - `[x]` Backend Scoring Script: Write a PHP background script that parses these rules, scores cards based on the requested skills/types, and returns the highest-scoring valid deck.

- `[ ]` **Phase 3: Fleshing out Remaining Pages & QA**
  - `[ ]` User Decks Page: Build out the CRUD interfaces for saving decks to a user profile.
  - `[ ]` Collection Manager Page: Build the interface so users can track which cards they own.
  - `[ ]` UI QA & Testing: Thoroughly test all UI flows, responsive layouts, and edge cases.

- `[ ]` **Phase 4: Data Pipelines & Assets**
  - `[ ]` Card Art Pipeline: Script to download and map images to local storage and update MongoDB `image_url` fields.
  - `[ ]` Semi-Automated Windows Data Upload: Create a drag-and-drop admin UI and `api/sync_database.php` endpoint to consume `umamusu-utils` JSON dumps from your Windows machine.

- `[ ]` **Phase 5: The Deck Generator (LLM-Assisted)**
  - `[ ]` Natural Language Deck Generation: Leverage an LLM API to interpret human-readable restrictions and automatically generate the complex queries/scoring metrics for the generator.
