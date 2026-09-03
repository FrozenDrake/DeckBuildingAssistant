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
*   **Layout:** 
    *   **Sub Header:** A sticky bar at the top containing the dynamic filters, search bar, and deck action buttons (Save, Export).
    *   **Left Panel (Card Collection):** A scrollable area displaying the available card pool. Depending on the page state, this can show either *all existing cards* for the game, or *only cards the user currently owns*.
    *   **Right Panel (Active Deck):** Displays the cards currently added to the deck and validation against the Game rules (e.g., total count, unique rules).
*   **Dynamic Deck Rendering:** The Active Deck panel must render conditionally based on the game's `max_deck_size` metadata:
    *   **Small Decks (<= 10 cards):** Uses a visual "slot" layout (e.g., 6 large empty card slots for Umamusume).
    *   **Large Decks (> 10 cards):** Uses a compact, vertical list format grouped by card type/cost with the quantity of each card displayed on the right (similar to Eternal Card Game).
*   **Dynamic Filtering:** The filtering tools in the sub header must generate based on the Game Metadata's schema (e.g., Umamusume filters vs Eternal filters).

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

## 4. Global Components

### 4.1 Theme Selector
A dynamic UI component available globally across the application, allowing the user to customize the visual theme.
*   **Position:** Located in the top right corner of the page.
*   **Interface:** A dropdown menu.
*   **Presets:** Includes default predefined themes (e.g., Light, Dark, Pink, Red, etc.).
*   **Custom Theme Option:** 
    *   Allows the user to input or pick 4 distinct hex color codes to build a custom palette.
    *   Includes an "Is Dark" / "Is Light" toggle. This ensures that typography and UI elements maintain appropriate contrast (e.g., forcing text to white on a dark custom background, or black on a light custom background).

### 4.2 Global Left Sidebar (Navigation)
A collapsible sidebar component providing primary navigation across the entire application.
*   **Trigger:** A hamburger icon located in the top left corner of the screen.
*   **Interaction:** Expands or contracts when the user hovers over or clicks the icon.
*   **Level 1 (Game Selection):** Vertically lists all available games. The user's most recently interacted games should be prioritized and listed at the top. Includes a dedicated search bar to filter the game list as the catalog grows indefinitely.
*   **Level 2 (Game-Specific Options):** Upon selecting a game, the panel expands further to reveal navigation options specific to that game, including:
    *   Deck Builder
    *   Game Rules Editor
    *   Browse User Decks
    *   Manage Collection

## 5. Generic Reusable Components

### 5.1 Custom Dropdown
A fully styled, custom Vue component designed to replace the native HTML `<select>` element.
*   **Purpose:** To provide a consistent, theme-aware dropdown experience across the application. This will be especially critical for the complex, dynamic deck-building filters.
*   **Styling:** Must inherit colors from the global CSS variables (`--bg-color`, `--surface-color`, `--primary-color`, `--text-color`) to seamlessly match the active theme.
*   **Behavior:** 
    *   Should open and close reliably upon user interaction.
    *   Must allow dynamic passing of options (e.g., arrays of objects) via Vue props.
    *   Should emit standard events when an option is selected so parent components can react easily.
    *   **Scalability:** If the number of options exceeds a specified threshold (e.g., > 10 options), the dropdown menu must automatically inject a search bar at the top to allow users to filter the list. The list itself must truncate and become scrollable to prevent overflowing the viewport.

### 5.2 Complex Logic Filter
A highly dynamic component designed to build advanced boolean queries (AND, OR, NOT) for filtering datasets.
*   **Purpose:** Primarily used in the Deck Builder to find specific cards, but generic enough to be used anywhere.
*   **Interface:** 
    *   A visual query builder where users can add "Rules" (e.g., `[Field] [Operator] [Value]`) and "Groups" (nested sets of rules).
    *   Supports toggling the logical condition between rules/groups (AND / OR).
    *   Supports negation operators (IS NOT / DOES NOT CONTAIN).
*   **Dynamic Configuration:** Must accept a schema via Vue props defining what "Fields" and "Operators" are available, since every card game will have entirely different attributes.
