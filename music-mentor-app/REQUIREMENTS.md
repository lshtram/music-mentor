# Music Mentor - Requirements

## Core Product Intent
- The app is a guided listening companion (cultural journal / liner notes feel).
- The interface prioritizes reading, reflection, and curation, not dashboards or playlists.

## Authentication & Users
- Users authenticate with email + password.
- Each user has a separate library, prompt history, recommendations, and preferences.
- Auth state gates Library and Recommendation views.

## Recommendations (Must-Have)
- Generate **5 album recommendations** based on:
  - The user prompt
  - The user library (listened/rated albums)
  - Previous recommendations (avoid repeats)
- Only return album **title and artist** from the recommendation generator.
- **Verify every recommendation** against a real source (iTunes) before returning.
- If fewer than 5 real albums are verified:
  - Return the verified subset immediately.
  - Continue background attempts to fill remaining slots.
- Never recommend albums already in:
  - Library
  - Seen recommendations
  - Current recommendations

## Prompt Handling
- Prompt is editable.
- "Save & Regenerate" triggers new recommendations.
- "Randomize prompt" generates a new prompt using AI:
  - Based on current prompt and library
  - Expands taste slightly
  - Does not auto-regenerate recommendations
- "Original quest" restores the last user-written prompt:
  - If none exists, fallback to the default prompt

## Settings
- Base quest summary from all prompts used so far.
- User can choose how many recommendations to show (3–10).
- User can change password.
- User can choose preferred music app (Apple Music, Spotify, Other).

## Library
- Library lists albums saved by the user.
- Stored data should be minimal (title, artist, cover, rating, playback link).
- Album details are fetched on demand when a library item is opened.
- Users can:
  - Rate albums (1–5 stars)
  - Remove albums (with confirmation)
  - Open album detail modal
  - Open Apple Music

## Album Detail Modal
- Shows enriched album details:
  - Summary
  - Personnel
  - Release year and genres (if available)
- Artist and personnel names open a Wikipedia summary popup.

## Audio Preview
- Album cards show a play button to preview (if available).
- Uses iTunes preview URLs (no subscription required).

## Admin
- Admin endpoint to list users and reset passwords.
- Admin access protected by `ADMIN_SECRET`.

## Design Requirements
- Editorial, spacious layout.
- Typography-led UI.
- Minimal UI chrome, no cards/borders.
- Recommendation list is vertical.
- Stars are visible and legible (gray default, yellow on hover/selected).

## Error Handling
- Network/API failures must show clean errors in UI.
- Recommendation failures should return some results if possible, never empty without error.
