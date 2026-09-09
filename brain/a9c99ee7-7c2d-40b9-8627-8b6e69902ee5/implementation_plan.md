# Phase 5: LLM-Assisted Deck Generator & Search (Tool-Calling Agent)

To support massive games like Magic: The Gathering (30,000+ cards) without blowing up the context window or causing massive latency, the AI will act as an autonomous agent equipped with **Function Calling (Tools)**. Instead of dumping the whole database into its prompt, we give it a tool to query the database itself.

## User Review Required

> [!IMPORTANT]
> **API Key Setup**: You will need to generate a free Gemini API key from Google AI Studio. We will need to inject this into your local Docker environment via a `.env` file before the feature can work.

## Proposed Changes

### Backend LLM Integration
#### [NEW] `src/api/llm_agent.php`
- Receives the user's natural language prompt and their `game_id`.
- Initializes a multi-turn conversation with the `gemini-1.5-flash` API.
- **Equips the AI with Tools:**
  1. `googleSearch`: Built-in Gemini tool to browse the live web for meta/tier lists.
  2. `query_card_database(complex_filters)`: A custom function we define in the API payload. When the AI calls this, PHP intercepts it, runs the AI's requested filters through our existing MongoDB ComplexFilter engine, and returns a minified list of matching cards back to the AI.
- **The Agent Loop:**
  1. The AI searches the web for the meta.
  2. The AI repeatedly calls `query_card_database` to find specific cards (e.g. "Find me red creatures under 3 mana").
  3. Once it has gathered the best candidates in its working memory, it evaluates their specific synergies.
  4. It returns the final structured JSON: `{ "explanation": "...", "card_ids": [...] }`.

### Frontend UI Updates
#### [MODIFY] `src/js/components/DeckGeneratorModal.js`
- Redesign the modal to have two tabs: **Algorithmic (Fast)** and **AI Agent (Smart)**.
- Displays a dynamic loading status that updates as the agent works (e.g., *"Searching the web..."* -> *"Querying the database for Speed cards..."* -> *"Evaluating synergies..."*).
- Upon success, directly populates the Current Deck panel with the exact cards the AI picked and displays the AI's `explanation` text.

#### [MODIFY] `docker-compose.yml`
- Expose a `GEMINI_API_KEY` environment variable to the `web` container.

## Verification Plan

### Manual Verification
1. Insert a test `GEMINI_API_KEY` into `.env`.
2. Type: *"Build a deck focused on corner acceleration for front runners based on the current tier list."*
3. Verify the LLM successfully hits the web, makes tool calls to `query_card_database`, and returns a highly synergistic deck with a coherent strategic explanation.
