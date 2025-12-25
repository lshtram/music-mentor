# Music Mentor - Implementation Details

## Frontend Structure

### State Management
`src/context/MusicContext.tsx`
- Central state: prompt, library, recommendations, auth, loading/error flags.
- Handles:
  - Recommendation regeneration
  - Prompt save + randomize
  - Library updates (rate/listen/skip/remove)
  - Persisting prompt, library, recommendations to Supabase

### Key Components
`src/components/PromptEditor.tsx`
- Prompt input
- "Original quest", "Randomize prompt", "Save & Regenerate"

`src/components/AlbumCard.tsx`
- Displays recommendation card
- Preview audio play button
- Rating stars, Save, Play in Apple Music, Set aside
- Loading overlay while recommendations refresh

`src/components/AlbumModal.tsx`
- Album details and personnel
- Wikipedia summary for personnel

`src/components/ArtistModal.tsx`
- Artist summary popup

`src/components/AlbumCover.tsx`
- Handles cover image loading and fallback

### Pages
`src/app/page.tsx`
- Recommendations view

`src/app/library/page.tsx`
- Library list
- Add album flow (search + disambiguation)
- Opens modal and fetches album details on demand
- Pagination at 20 albums per page

`src/app/settings/page.tsx`
- Base quest summary (prompt history)
- Recommendation count control
- Preferred music app selection
- Password update

`src/app/admin/page.tsx`
- Admin interface for user list and password resets

## API Routes

### Recommendations
`src/app/api/recommendations/route.ts`
- Inputs: prompt, library albums, exclusions
- Uses Google Generative AI to generate album seeds
- Verifies with iTunes search
- Normalizes album title/artist to matched iTunes release
- Stores seen recommendations to avoid repeats
- Returns up to 5 verified album seeds

### Album Details
`src/app/api/album-details/route.ts`
- Input: list of album seeds
- Fetches cover, preview, Apple Music URL (iTunes)
- Uses AI to generate summary + personnel

### Album Search
`src/app/api/album-search/route.ts`
- iTunes search for fuzzy album add flow
- Returns multiple choices when ambiguous

### Prompt Save / Load
`src/app/api/prompt/route.ts`
- Stores:
  - `prompt`
  - `last_user_prompt` (only when prompt source is user-edited)
  - Prompt history entries for base quest summary

### Prompt Randomize
`src/app/api/prompt-randomize/route.ts`
- Uses AI to generate a fresh prompt
- Must be adjacent to current taste and library
- Enforces "How about albums like..." prefix and avoids specific album names

### Base Quest
`src/app/api/base-quest/route.ts`
- Summarizes prompt history using AI

### Settings
`src/app/api/settings/route.ts`
- Stores recommendations count and preferred music app

### Library CRUD
`src/app/api/library/route.ts`
- Minimal storage: title, artist, cover, rating, URLs
- Full details fetched only when needed

### Recommendations Store
`src/app/api/recommendations-store/route.ts`
- Stores last 5 recommendation albums for immediate reload

### Wikipedia Summary
`src/app/api/wiki-summary/route.ts`
- Fetches summary for artist/personnel popups

### Admin
`src/app/api/admin/users/route.ts`
- Lists users, reset passwords
- Protected by `ADMIN_SECRET`

## Recommendation Flow (End-to-End)
1) User clicks "Save & Regenerate"
2) `MusicContext` POSTs to `/api/recommendations` with prompt + exclusions
3) API generates album seeds via Google AI
4) API verifies each album via iTunes
5) Seeds returned (up to 5) and stored as seen
6) Client calls `/api/album-details` to enrich cards
7) Cards render; background regeneration fills missing slots

## Prompt Randomize Flow
1) User clicks "Randomize prompt"
2) `MusicContext` calls `/api/prompt-randomize` with prompt + library
3) AI returns new prompt
4) Prompt updates locally (no recommendations generated)

## Settings Flow
1) Settings page loads user settings via `/api/settings`.
2) Base quest summary loads via `/api/base-quest`.
3) Updates are persisted through `/api/settings`.
4) Password updates use Supabase auth update user.

## Auth Flow
1) User signs in with email/password via Supabase
2) Access token attached to API calls
3) User-specific data loaded from Supabase

## UI/Design
- Editorial fonts and spacing from `src/app/globals.css`
- Minimal card chrome, typography-driven layout
