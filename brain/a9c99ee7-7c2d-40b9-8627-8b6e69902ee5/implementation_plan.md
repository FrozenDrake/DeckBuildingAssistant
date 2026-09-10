# Phase 7: Platform & Game Management

## Proposed Changes

### 1. Game Creation Suite
- **[NEW] `src/js/pages/CreateGame.js`**: A frontend page with a simple form (Game Name, Game Description).
- **[MODIFY] `src/js/components/NavBar.js`**: Add a "Create Game" link.
- **[NEW] `src/api/create_game.php`**: 
  - Validates authentication.
  - Inserts a new document into `deckbuilder.games` with `is_public: false` and default empty schema/rules.
  - Pushes the new game's `_id` into the authenticated user's `admin_games` array in `deckbuilder.users`, making them the owner.

### 2. Public / Private Games
- **[MODIFY] `src/js/pages/AdminDashboard.js`**: 
  - Add a "Visibility Settings" panel with a toggle for Public/Private.
- **[MODIFY] `src/api/admin_update_game.php`**:
  - Accept and update the `is_public` boolean on the game document.
- **[MODIFY] `src/api/get_games.php`**:
  - Check `$_SESSION['user_id']` and their `admin_games`.
  - Only return games where `is_public == true` OR the game's ID is in the user's `admin_games` array.

### 3. Multi-Admin Management
- **[MODIFY] `src/js/pages/AdminDashboard.js`**:
  - Add an "Admin Management" panel.
  - An input to enter a username, and a button to "Grant Admin".
  - A list of current admins, with a button to "Revoke Admin".
- **[NEW] `src/api/admin_manage_roles.php`**:
  - Validates the current user is an admin of the game.
  - Accepts a `target_username` and `action` (grant/revoke).
  - Pushes or pulls the game's `_id` from the target user's `admin_games` array in `deckbuilder.users`.
- **[NEW] `src/api/admin_get_roles.php`**:
  - Returns a list of usernames who have this game in their `admin_games` array.

## Verification
- Test creating a game and ensuring it appears only to the creator.
- Test toggling it to public and ensuring an incognito window can see it.
- Test granting admin rights to a test user and ensuring they can access the Admin Dashboard for that game.
