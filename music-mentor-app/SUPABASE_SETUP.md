# Supabase Setup (Free Tier)

## 1) Create a Supabase project
- Go to https://supabase.com and create a new project (free tier).
- Copy the project URL and API keys from Settings → API.

## 2) Configure environment variables
Create or update `music-mentor-app/.env.local`:

```
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Notes:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the publishable/anon key from Supabase.
- The API routes use the service role key on the server only.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

## 3) Create tables
In Supabase SQL editor, run:

```
-- See full schema
\i supabase/schema.sql
```

Or paste the contents of `music-mentor-app/supabase/schema.sql` directly.

## 4) (Optional) RLS
Row Level Security is off by default for new tables.
If you enable RLS, you must add policies for `user_id` access.

## 5) Run the app
```
cd /workspaces/music-mentor/music-mentor-app
npm run dev -- -H 0.0.0.0 -p 3001
```

## What gets stored
- User prompt per user (`user_prompts`)
- Library albums per user (`library_albums`)
