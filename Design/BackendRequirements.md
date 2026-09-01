# Deck Building Assistant - Backend Requirements

## 1. Underlying Architecture
The backend will serve as the API layer connecting the frontend to the database. It will handle data ingestion, routing, and database queries. A NoSQL solution (MongoDB) is required due to the highly dynamic and unstructured nature of card data across different games.

## 2. Database Design (MongoDB)
The database will consist of four primary collections:

### 2.1 Collection 1: Cards
Stores the actual card entities. 
*   **Name:** String (e.g., "Goku", "Fireball")
*   **Image Filepath:** String (Optional for v1)
*   **Card Type:** String (Universal classifications like "Spell", "Creature", "Support")
*   **Max Per Deck:** Integer (Maximum allowed copies of this specific card in a deck)
*   **Game ID:** Reference to the Game Metadata collection.
*   **Rules Text (JSON Blob):** A dynamic JSON object containing the game-specific rules. 
    *   *Example (Eternal):* `{"text": "Deal 3 damage."}`
    *   *Example (Umamusume):* `{"skills": [...], "passive_effects": [...], "associated_characters": [...], "unique_passive": "...", "event_trees": [...]}`

### 2.2 Collection 2: Game Metadata
Stores the rules and parsing instructions for each game.
*   **Game Name:** String
*   **Deck Minimum Size:** Integer
*   **Deck Maximum Size:** Integer
*   **Other Restrictions (JSON Blob):** Game-specific rules (e.g., faction limits, restricted lists).
*   **Card Schema Definition:** Instructions or mapping configurations that tell the UI/Backend how to parse, render, and filter the specific "Rules Text" JSON blob for this game's cards.

### 2.3 Collection 3: User Decks
Stores the decks created by users.
*   **Deck ID:** Primary Key
*   **User ID:** Reference to the User.
*   **Game ID:** Reference to the Game Metadata.
*   **Cards:** Array of Card IDs and their quantities.

### 2.4 Collection 4: User Collections (Low Priority)
Tracks the cards a user actually owns.
*   **User ID:** Reference to the User.
*   **Game ID:** Reference to the Game Metadata.
*   **Owned Cards:** Array of Card IDs and their quantities.

## 3. Core API Workflows

### 3.1 Data Ingestion & Serving
When the frontend requests cards for the Deck Builder Page, the backend must:
1. Fetch the Game Metadata for the selected game.
2. Fetch the corresponding Cards based on filters.
3. Serve the cards alongside the Game Metadata schema so the frontend can dynamically build the interface.

### 3.2 Deck Validation
When a user attempts to save a deck, the backend should validate the deck's contents against the restrictions defined in the Game Metadata before saving it to the User Decks collection.

