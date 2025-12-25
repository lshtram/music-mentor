create table if not exists user_prompts (
  user_id text primary key,
  prompt text,
  last_user_prompt text,
  updated_at timestamptz default now()
);

create table if not exists user_prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  prompt text not null,
  source text not null default 'auto',
  created_at timestamptz default now()
);

create index if not exists user_prompt_history_user_id_idx on user_prompt_history (user_id);

create table if not exists library_albums (
  id text not null,
  user_id text not null,
  album_key text not null,
  title text not null,
  artist_id text,
  artist_name text not null,
  artist_bio text,
  cover_url text,
  preview_url text,
  apple_music_url text,
  summary text,
  rating integer,
  listened boolean default true,
  skipped boolean default false,
  date_added timestamptz default now(),
  personnel jsonb,
  release_year integer,
  genres text[],
  primary key (user_id, album_key)
);

create index if not exists library_albums_user_id_idx on library_albums (user_id);

create table if not exists user_recommendations (
  user_id text primary key,
  recommendations jsonb,
  updated_at timestamptz default now()
);

create table if not exists user_seen_recommendations (
  user_id text not null,
  album_key text not null,
  seen_at timestamptz default now(),
  primary key (user_id, album_key)
);

create index if not exists user_seen_recommendations_user_id_idx on user_seen_recommendations (user_id);

create table if not exists user_settings (
  user_id text primary key,
  recommendations_count integer default 5,
  preferred_music_app text default 'apple',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
