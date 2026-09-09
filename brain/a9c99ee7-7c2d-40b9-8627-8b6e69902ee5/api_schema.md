# API Interface Documentation

This document describes the exact request schemas and response formats for the Deck Building Assistant APIs to prevent mismatch errors between the PHP backend and Vue frontend.

## `POST /api/submit_art.php`

**Description:** Accepts a user-submitted image for a card, processes it into a standard WebP format (400x560), and places it in the moderation queue.
**Authentication:** Required (User session)

### Request (`multipart/form-data`)
| Field | Type | Description |
|-------|------|-------------|
| `image` | `File` | The uploaded image file (JPG, PNG, WebP). |
| `card_id` | `string` | The 24-character hexadecimal MongoDB `_id` of the card. |
| `game_id` | `string` | The 24-character hexadecimal MongoDB `_id` of the game. |

### Response (`application/json`)
**Success (200 OK):**
```json
{
  "success": true,
  "message": "Art submitted for moderation."
}
```
**Error (400/401/500):**
```json
{
  "error": "Error message description."
}
```

---

## `GET /api/get_art_submissions.php`

**Description:** Fetches all pending card art submissions for a specific game.
**Authentication:** Required (Admin user session only)

### Request (`query parameters`)
| Field | Type | Description |
|-------|------|-------------|
| `game_id` | `string` | The 24-character hexadecimal MongoDB `_id` of the game. |

### Response (`application/json`)
**Success (200 OK):**
```json
[
  {
    "id": "6a97...",
    "card_id": "6a97...",
    "card_name": "Special Week",
    "user_id": "6a97...",
    "name": "Admin",
    "file_name": "sub_12345.webp",
    "submitted_at": "2026-09-09T20:00:00Z"
  }
]
```
*(Note: Empty queue returns an empty array `[]`)*

**Error (400/401/403/404/500):**
```json
{
  "error": "Forbidden"
}
```

---

## `POST /api/moderate_art.php`

**Description:** Approves or rejects a pending art submission.
**Authentication:** Required (Admin user session only)

### Request (`application/json`)
```json
{
  "submission_id": "6a97...",
  "action": "approve" // or "reject"
}
```

### Response (`application/json`)
**Success (200 OK):**
```json
{
  "success": true
}
```
**Error (400/401/403/404/500):**
```json
{
  "error": "Pending submission not found"
}
```

---

## `POST /api/sync_database.php`

**Description:** Bulk syncs a JSON array of card data to a game.
**Authentication:** Required (Admin user session only)

### Request (`multipart/form-data`)
| Field | Type | Description |
|-------|------|-------------|
| `dump` | `File` | A JSON file containing an array of card objects. |
| `game_id` | `string` | The 24-character hexadecimal MongoDB `_id` of the game. |

### Response (`application/json`)
**Success (200 OK):**
```json
{
  "success": true,
  "inserted": 1500,
  "skipped": 0
}
```
**Error (400/401/403/500):**
```json
{
  "error": "Uploaded file is not a valid JSON array."
}
```

