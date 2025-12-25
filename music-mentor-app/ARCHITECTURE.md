# Music Mentor - Architecture

## High-Level Overview

```
Frontend (Next.js App Router)
  ↓
API Routes (Next.js)
  ↓
Supabase (Auth + DB)
  ↓
External Services (Google AI + iTunes + Wikipedia)
```

## Frontend
- `MusicContext` is the state hub.
- Pages:
  - `/` Recommendations view
  - `/library` Library view
  - `/admin` Admin tools
- Components:
  - Prompt editor, album cards, modals, artist wiki popup.

## Backend API Routes

### Core
- `/api/recommendations`
  - AI candidate generation (Gemini)
  - iTunes verification + normalization
  - Seen recommendations tracking
- `/api/album-details`
  - iTunes cover/preview/Apple Music URL
  - AI summary + personnel

### Library + Prompt
- `/api/library` - Library CRUD (minimal storage)
- `/api/prompt` - Prompt storage + last user prompt
- `/api/prompt-randomize` - AI-generated prompt variations
- `/api/base-quest` - Prompt history summary
- `/api/settings` - User preferences (recommendation count, music app)

### Misc
- `/api/album-search` - iTunes search for add-album flow
- `/api/recommendations-store` - stores last 5 recommendations
- `/api/wiki-summary` - Wikipedia snippet lookup
- `/api/admin/users` - admin user list + password reset

## Data Flow: Recommendations
1) User clicks “Save & Regenerate.”
2) Client sends prompt + exclusions to `/api/recommendations`.
3) AI returns seed list `{ title, artist }`.
4) Server verifies via iTunes and normalizes to real releases.
5) Seeds returned to client (up to 5).
6) Client calls `/api/album-details` to enrich cards.
7) Seen list is updated to prevent repeats.
8) Background fills missing slots if fewer than 5.

## Data Flow: Library Detail Fetch
1) Library list loads minimal data.
2) User opens an album.
3) Client calls `/api/album-details` with `{ title, artist }`.
4) Modal shows enriched data.

## Data Storage
See `DATABASE.md` for full schema and table details.
