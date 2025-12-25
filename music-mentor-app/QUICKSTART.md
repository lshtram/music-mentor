# Quick Start

## 1) Install
```
cd music-mentor-app
npm install
```

## 2) Environment Variables
Create `music-mentor-app/.env.local`:

```
GOOGLE_AI_API_KEY=your-google-ai-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ADMIN_SECRET=your-admin-secret
```

## 3) Database
Run schema SQL in Supabase:
```
-- See full schema
\i supabase/schema.sql
```

Or paste the contents of `music-mentor-app/supabase/schema.sql` into the Supabase SQL editor.

## 4) Run the App
```
npm run dev -- -H 0.0.0.0 -p 3001
```

Open `http://localhost:3001`

## 5) Verify Core Flows
- Sign up / sign in.
- Save prompt → regenerate recommendations.
- Randomize prompt (does not auto-regenerate).
- Rate an album → appears in library.
- Open library album → details fetched on demand.
- Update settings (recommendation count, music app, password).

## Common Issues
- **Recommendations fail**: check `GOOGLE_AI_API_KEY` and iTunes connectivity.
- **Supabase errors**: verify `SUPABASE_URL` and keys; confirm tables exist.
- **Auth issues**: ensure Supabase email/password auth is enabled.
