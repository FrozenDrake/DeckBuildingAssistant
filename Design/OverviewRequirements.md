# Deck Building Assistant - Overview Requirements

## 1. Application Purpose
The Deck Building Assistant is a multi-game, data-driven web application designed to help users build and tinker with card decks for various games. Because different card games have vastly different rules, card types, and restrictions, the application aims to use a generic, flexible schema (via a NoSQL database) that adapts to the specific game being played.

## 2. Core Philosophy
The primary goal is to provide a robust filtering system against a complete set of cards for a given game, enabling users to easily find cards and construct valid decks based on the game's specific rules. 

## 3. High-Level Features & Priorities

### High Priority (MVP)
*   **Agnostic Data Structure:** Support a flexible schema allowing completely different games (e.g., *Umamusume: Pretty Derby* vs. *Eternal Card Game*) to coexist in the same application.
*   **Game Rules Metadata:** The ability to dynamically ingest and apply deck restrictions (min/max cards, specific rules) and card schemas based on the selected game.
*   **Deck Builder Interface:** A robust UI showing all cards in a selected game with a highly capable filtering system.
*   **Deck Construction:** The ability to add/remove cards to a deck being actively built, respecting the basic rules (like max number of a specific card).

### Medium Priority
*   **Game Rules Editor:** A UI page allowing users to view and edit the rules, schemas, and deck limitations for a given game.
*   **User Deck Storage:** The ability for users to save the decks they have constructed.
*   **Deck Management Interface:** A page displaying all decks a user has built and saved.

### Low Priority
*   **Collection Management:** Allowing users to input their owned cards and build decks restricted to their actual collection.
*   **Card Art Integrations:** Displaying image files for cards (text/metadata is sufficient for v1).
*   **User Accounts & Logins:** Full authentication and multi-tenant isolation.
*   **Import / Export:** Features to import or export decks to and from standard game text formats.

## 4. Test Cases
The application must demonstrate its flexibility by successfully supporting the deck building rules and card structures for two vastly different games:
1.  **Umamusume: Pretty Derby:** Features complex cards with multiple text blobs (skills, passive effects, associated characters, unique passive effects, event trees) but small decks.
2.  **Eternal Card Game:** Features standard trading card game data structures with a single blob for rules text but larger deck building.

