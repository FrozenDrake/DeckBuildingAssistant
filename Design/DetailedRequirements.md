# Deck Building Assistant - Detailed Requirements

## 1. Underlying Architecture

The application will feature a web-based frontend and a backend interacting with a NoSQL database (such as MongoDB). A NoSQL solution is required due to the highly dynamic and unstructured nature of card data across different games.

### 1.1 Database Design (MongoDB)
The database will consist of four primary collections:

#### Collection 1: Cards
Stores the actual card entities. 
*   **Name:** String (e.g., "Goku", "Fireball")
*   **Image Filepath:** String (Optional for v1)
*   **Card Type:** String (Universal classifications like "Spell", "Creature", "Support")
*   **Max Per Deck:** Integer (Maximum allowed copies of this specific card in a deck)
*   **Game ID:** Reference to the Game Metadata collection.
*   **Rules Text (JSON Blob):** A dynamic JSON object containing the game-specific rules. 
    *   *Example (Eternal):* `{"text": "Deal 3 damage."}`
    *   *Example (Umamusume):* `{"skills": [...], "passive_effects": [...], "associated_characters": [...], "unique_passive": "...", "event_trees": [...]}`

#### Collection 2: Game Metadata
Stores the rules and parsing instructions for each game.
*   **Game Name:** String
*   **Deck Minimum Size:** Integer
*   **Deck Maximum Size:** Integer
*   **Other Restrictions (JSON Blob):** Game-specific rules (e.g., faction limits, restricted lists).
*   **Card Schema Definition:** Instructions or mapping configurations that tell the UI/Backend how to parse, render, and filter the specific "Rules Text" JSON blob for this game's cards.

#### Collection 3: User Decks
Stores the decks created by users.
*   **Deck ID:** Primary Key
*   **User ID:** Reference to the User.
*   **Game ID:** Reference to the Game Metadata.
*   **Cards:** Array of Card IDs and their quantities.

#### Collection 4: User Collections (Low Priority)
Tracks the cards a user actually owns.
*   **User ID:** Reference to the User.
*   **Game ID:** Reference to the Game Metadata.
*   **Owned Cards:** Array of Card IDs and their quantities.

## 2. User Interface (UI) Design

The web interface needs to be clean, responsive, and highly focused on the deck building workflow.

### 2.1 Deck Builder Page (High Priority)
This is the core of the application.
*   **Layout:** A split-screen or multi-panel view. One panel displays the available card pool, and another displays the current deck in progress.
*   **Dynamic Filtering:** The filtering tools must dynamically generate based on the Game Metadata's schema. If the user selects Umamusume, they should see filters for "Skills" or "Associated Characters". If they select Eternal, they should see standard TCG filters.
*   **Card Pool Display:** A scrollable, paginated list or grid of available cards matching the current filters.
*   **Active Deck Panel:** Displays the cards currently added to the deck, total card count, and validation against the Game Metadata rules (e.g., highlights red if deck is under the minimum size).

### 2.2 Game Rules & Schema Editor Page (Medium Priority)
An admin/power-user interface to configure games.
*   **Functionality:** Allows users to view and edit the Game Metadata collection.
*   **Forms:** Inputs for max/min deck sizes, and a raw JSON/schema editor for defining how the game's unique rules text and deck restrictions are structured.

### 2.3 User Decks Page (Medium Priority)
A simple management dashboard.
*   **Functionality:** Lists all saved decks associated with the user's account.
*   **Actions:** View, Edit (loads into Deck Builder), Delete, and eventually Export.

## 3. Data Ingestion & Parsing Workflow
When the frontend requests cards for the Deck Builder Page, the backend must:
1. Fetch the Game Metadata for the selected game.
2. Fetch the corresponding Cards.
3. Serve the cards alongside the Game Metadata schema so the frontend knows how to interpret the dynamic `Rules Text` JSON blob to build the appropriate UI filters and card display components.

