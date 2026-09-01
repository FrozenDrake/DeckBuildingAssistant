# Deck Building Assistant - Frontend Requirements

## 1. Overview
The web interface needs to be clean, responsive, and highly focused on the deck building workflow. It will communicate with the backend via APIs to fetch Game Metadata, Cards, and User Decks.

## 2. User Interface (UI) Pages

### 2.1 Global Home / Landing Page
The entry point for the application.
*   **Hero Section:** A welcoming banner explaining the multi-game Deck Building Assistant.
*   **Game Selection:** A prominent area where users can select which game they want to interact with (e.g., Umamusume, Eternal). Selecting a game routes the user to that specific Game Home Page.

### 2.2 Game Home Page
A central hub for a specific selected game.
*   **Game Dashboard:** Provides game-specific options for the user.
*   **Navigation Actions:** Quick links allowing the user to "Browse Decks", "Create Deck" (routing to the Deck Builder), "Manage Collection", or "See All Cards".

### 2.3 Deck Builder Page (High Priority)
This is the core of the application.
*   **Layout:** A split-screen or multi-panel view. One panel displays the available card pool, and another displays the current deck in progress.
*   **Dynamic Filtering:** The filtering tools must dynamically generate based on the Game Metadata's schema. If the user selects Umamusume, they should see filters for "Skills" or "Associated Characters". If they select Eternal, they should see standard TCG filters.
*   **Card Pool Display:** A scrollable, paginated list or grid of available cards matching the current filters.
*   **Active Deck Panel:** Displays the cards currently added to the deck, total card count, and validation against the Game Metadata rules (e.g., highlights red if deck is under the minimum size).

### 2.4 Game Rules & Schema Editor Page (Medium Priority)
An admin/power-user interface to configure games.
*   **Functionality:** Allows users to view and edit the Game Metadata collection.
*   **Forms:** Inputs for max/min deck sizes, and a raw JSON/schema editor for defining how the game's unique rules text and deck restrictions are structured.

### 2.5 User Decks Page (Medium Priority)
A simple management dashboard.
*   **Functionality:** Lists all saved decks associated with the user's account.
*   **Actions:** View, Edit (loads into Deck Builder), Delete, and eventually Export.

## 3. Data Rendering Workflow
When the frontend requests cards for the Deck Builder Page, it must:
1. Receive the cards alongside the Game Metadata schema from the backend.
2. Use the metadata schema to interpret the dynamic `Rules Text` JSON blob.
3. Build the appropriate UI filters and card display components dynamically based on that interpretation.
