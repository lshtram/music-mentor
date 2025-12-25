# Music Mentor - Database Schema

All tables are defined in `music-mentor-app/supabase/schema.sql`.

## Tables

### user_prompts
Stores the current prompt and the last user-written prompt.

Columns:
- `user_id` (text, primary key)
- `prompt` (text)
- `last_user_prompt` (text)
- `updated_at` (timestamptz, default now)

Notes:
- `prompt` can be AI-randomized.
- `last_user_prompt` only updates when the user edits the prompt directly.

### user_prompt_history
Stores every prompt saved for a user (user-written or AI-randomized).

Columns:
- `id` (uuid, primary key)
- `user_id` (text)
- `prompt` (text)
- `source` (text, default `auto`)
- `created_at` (timestamptz, default now)

Notes:
- Used to generate the Base Quest summary.

### library_albums
Stores the user library with minimal data for fast load.

Columns:
- `id` (text)
- `user_id` (text)
- `album_key` (text, primary key with user_id)
- `title` (text)
- `artist_id` (text)
- `artist_name` (text)
- `artist_bio` (text, nullable)
- `cover_url` (text, nullable)
- `preview_url` (text, nullable)
- `apple_music_url` (text, nullable)
- `summary` (text, nullable)
- `rating` (integer, nullable)
- `listened` (boolean, default true)
- `skipped` (boolean, default false)
- `date_added` (timestamptz, default now)
- `personnel` (jsonb, nullable)
- `release_year` (integer, nullable)
- `genres` (text[], nullable)

Notes:
- The current implementation only stores minimal fields.
- Details (summary/personnel/genres) are fetched on demand.

### user_recommendations
Stores the **latest 5** recommendations for fast rehydration.

Columns:
- `user_id` (text, primary key)
- `recommendations` (jsonb)
- `updated_at` (timestamptz, default now)

### user_seen_recommendations
Stores all recommendations ever shown to a user.

Columns:
- `user_id` (text)
- `album_key` (text)
- `seen_at` (timestamptz, default now)
- Primary key: (`user_id`, `album_key`)

### user_settings
Stores user preferences and display options.

Columns:
- `user_id` (text, primary key)
- `recommendations_count` (integer, default 5)
- `preferred_music_app` (text, default `apple`)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

## Indexes
- `library_albums_user_id_idx`
- `user_prompt_history_user_id_idx`
- `user_seen_recommendations_user_id_idx`

## Data Ownership
Every table is scoped by `user_id`.
If Row Level Security is enabled, policies must allow users to access only their own rows.
