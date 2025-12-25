import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const requiredTables = {
  user_prompts: ['user_id', 'prompt', 'last_user_prompt', 'updated_at'],
  user_prompt_history: ['id', 'user_id', 'prompt', 'source', 'created_at'],
  library_albums: [
    'id',
    'user_id',
    'album_key',
    'title',
    'artist_id',
    'artist_name',
    'artist_bio',
    'cover_url',
    'preview_url',
    'apple_music_url',
    'summary',
    'rating',
    'listened',
    'skipped',
    'date_added',
    'personnel',
    'release_year',
    'genres',
  ],
  user_recommendations: ['user_id', 'recommendations', 'updated_at'],
  user_seen_recommendations: ['user_id', 'album_key', 'seen_at'],
  user_settings: ['user_id', 'recommendations_count', 'preferred_music_app', 'created_at', 'updated_at'],
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn('[db-check] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; skipping schema check.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const strict = process.env.DB_SCHEMA_STRICT === '1';
let hasError = false;

const checkTableColumns = async (table, columns) => {
  const { error } = await supabase
    .from(table)
    .select(columns.join(','))
    .limit(1);

  if (!error) return { ok: true };

  const message = error.message || 'Unknown error';
  return { ok: false, message };
};

const run = async () => {
  for (const [table, columns] of Object.entries(requiredTables)) {
    const result = await checkTableColumns(table, columns);
    if (!result.ok) {
      hasError = true;
      console.warn(`[db-check] Table ${table} missing or incomplete: ${result.message}`);
    }
  }

  if (hasError) {
    const message = '[db-check] Schema check failed. Run migrations from supabase/schema.sql.';
    if (strict) {
      console.error(message);
      process.exit(1);
    } else {
      console.warn(message);
    }
  } else {
    console.info('[db-check] Schema looks good.');
  }
};

run();
