# Deck Building Assistant - Task List

- `[x]` **Phase 1: UI Polish & Core Deck Builder**
  - `[x]` Theme-Aware Scrollbars: Update `main.css` to use `::-webkit-scrollbar` pseudo-elements tied to CSS variables.
  - `[x]` Deck Builder Sorting Options: Add a sorting dropdown to the Deck Builder subheader (e.g., Sort by Rarity, Name, Type).
  - `[x]` Complex Filters Integration: Wire up the existing recursive `ComplexFilter` component into a modal or expanding tray in the Deck Builder.

- `[x]` **Phase 2: The Deck Generator (Algorithmic)**
  - `[x]` Restriction-Based Deck Generator (V1): Build a UI tool that accepts arbitrary user restrictions (e.g., "3 Speed, 2 Stamina, 1 specific card, prioritize 'Sprint' skills").
  - `[x]` Backend Scoring Script: Write a PHP background script that parses these rules, scores cards based on the requested skills/types, and returns the highest-scoring valid deck.

- `[ ]` **Phase 3: Fleshing out Remaining Pages & QA**
  - `[x]` User Decks Page: Build out the CRUD interfaces for saving decks to a user profile.
  - `[x]` Collection Manager Page: Build the interface so users can track which cards they own.
  - `[ ]` UI QA & Testing: Thoroughly test all UI flows, responsive layouts, and edge cases.

- `[x]` **Phase 4: Data Pipelines & Assets**
  - `[x]` Semi-Automated Windows Data Upload: Drag-and-drop admin UI (`Sync Database` tab) + `api/sync_database.php`. Fields stored verbatim; card schema controls what surfaces in the UI.
  - `[x]` GameTora Scraper: Python webscraper (`scripts/gametora/`) that pulls support card data from GameTora and preprocesses it into a clean `public/data/cards.json` dump ready for upload.
  - `[x]` Card Art Moderation Pipeline: Create storage architecture for card images.
  - `[x]` Image submission flow for standard users (Deck Builder).
  - `[x]` Build Admin Moderation Queue UI.
  - `[x]` Implement approve/reject logic and image promotion.
  - `[x]` Integrate card art rendering into the core `db-card` template.

- `[ ]` **Phase 5: The Deck Generator (LLM-Assisted)**
  - `[ ]` Natural Language Deck Generation: Leverage the Gemini API with **Google Search Grounding** to interpret human-readable restrictions, search the live web for the latest meta/tier lists, and automatically generate the complex queries/scoring metrics for the generator.
  - `[ ]` Natural Language Deck Search: Allow users to type plain English queries (e.g. "show me speed decks with SSR cards") and have Gemini translate them into the ComplexFilterNode tree format to query the Browse Decks page.

- `[ ]` **Phase 6: Collection Import Pipelines**
  - `[ ]` Per-Game Import Adapters: Since there is no unified format between games, each game will need its own import adapter. The admin should be able to register an import format (e.g. a CSV column mapping, or a specific JSON dump shape) for their game, and users can then upload a file that gets parsed and bulk-upserted into their collection.

- `[ ]` **Phase 7: Platform & Game Management**
  - `[ ]` Game Creation Suite: A dedicated multi-step flow for creating a new game within the application. Covers game name, description, deck rules, card schema, and initial data upload in one guided wizard.
  - `[ ]` Public / Private Games: Games can be set to public (visible to all users) or private (visible only to admins and invited users). Add a toggle in the Admin Dashboard and enforce visibility in all search/browse endpoints.
  - `[ ]` Multi-Admin Role Management: Allow a game's primary admin to grant or revoke admin rights to other registered users from within the Admin Dashboard, so more than one person can manage the card database for a game.

- `[ ]` **Phase 8: Advanced Deck Rules**
  - `[ ]` Sum / Average Attribute Rule: Add a new rule type to the Deck Generator and Game Rules Editor that constrains or scores a deck based on the sum or average of a numeric card attribute across the whole deck (e.g. "total Friendship Bonus across all cards must be >= 80", or "average Hint Frequency >= 25").
