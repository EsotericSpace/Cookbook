-- ---------------------------------------------------------------------------
-- profiles (public display name, separate from the private auth email).
-- Set up first — recipes/tag_registry policies below reference
-- public.is_admin(), which reads this table, and Postgres parses/validates
-- "language sql" function bodies against the catalog at CREATE FUNCTION
-- time (unlike plpgsql), so the column has to exist before that function
-- is defined.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select
  to public
  using (true);

-- The app upserts on first sign-in as a fallback for the trigger below
-- (which only fires for brand-new signups, not accounts that already
-- existed before this table did), so insert needs to be allowed too, not
-- just update.
drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- RLS above is row-level only — "auth.uid() = id" would otherwise let anyone
-- flip their own is_admin to true via a direct client call. Block that: an
-- authenticated request (auth.uid() is not null) can only change is_admin if
-- it's already coming from an admin. A null auth.uid() means the request
-- came from the SQL editor or the service_role key, not a user session —
-- already-trusted access, so it's exempt (this is what lets you grant the
-- very first admin before any admin exists to grant it).
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_admin and auth.uid() is not null and not public.is_admin() then
      new.is_admin := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not public.is_admin() then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_is_admin();

-- Auto-create a profile (default name = the part of the email before "@")
-- whenever someone signs up, so display_name is never missing for new users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  source text,
  prep_time text,
  cook_time text,
  servings integer,
  image_url text,
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  tags jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "recipes are viewable by everyone" on public.recipes;
create policy "recipes are viewable by everyone"
  on public.recipes for select
  to public
  using (true);

drop policy if exists "users can insert their own recipes" on public.recipes;
create policy "users can insert their own recipes"
  on public.recipes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own recipes" on public.recipes;
create policy "users can update their own recipes"
  on public.recipes for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "users can delete their own recipes" on public.recipes;
create policy "users can delete their own recipes"
  on public.recipes for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists bookmarks_user_recipe_key
  on public.bookmarks (user_id, recipe_id);

alter table public.bookmarks enable row level security;

drop policy if exists "users manage their own bookmarks" on public.bookmarks;
create policy "users manage their own bookmarks"
  on public.bookmarks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  source_recipe_ids jsonb not null default '[]',
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

drop policy if exists "users manage their own shopping lists" on public.shopping_lists;
create policy "users manage their own shopping lists"
  on public.shopping_lists for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.tag_registry (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) default auth.uid(),
  category text not null,
  value text not null,
  color_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists tag_registry_category_value_key
  on public.tag_registry (category, lower(value));

alter table public.tag_registry enable row level security;

drop policy if exists "tag registry is viewable by everyone" on public.tag_registry;
create policy "tag registry is viewable by everyone"
  on public.tag_registry for select
  to public
  using (true);

drop policy if exists "authenticated users can add tags" on public.tag_registry;
create policy "authenticated users can add tags"
  on public.tag_registry for insert
  to authenticated
  with check (true);

drop policy if exists "authors can update their own tag colors" on public.tag_registry;
create policy "authors can update their own tag colors"
  on public.tag_registry for update
  to authenticated
  using (auth.uid() = created_by or public.is_admin())
  with check (auth.uid() = created_by or public.is_admin());

drop policy if exists "authors can delete their own tags" on public.tag_registry;
create policy "authors can delete their own tags"
  on public.tag_registry for delete
  to authenticated
  using (auth.uid() = created_by or public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime: enable change broadcasts for the live multi-user cache.
-- `alter publication ... add table` has no "if not exists" form, so this
-- catches the "already a member" error if it's already enabled.
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.recipes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_lists;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tag_registry;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bookmarks;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: recipe image uploads.
-- 2MB cap keeps recipe photos quick to load; matched by a client-side check
-- in src/lib/imageUpload.ts (which fails fast before even attempting the
-- upload) — this is the server-side backstop.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads are stored under `${userId}/...`, so a folder-prefix check is
-- enough to scope write access to the uploader's own files.
drop policy if exists "recipe images are viewable by everyone" on storage.objects;
create policy "recipe images are viewable by everyone"
  on storage.objects for select
  to public
  using (bucket_id = 'recipe-images');

drop policy if exists "users can upload their own recipe images" on storage.objects;
create policy "users can upload their own recipe images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update their own recipe images" on storage.objects;
create policy "users can update their own recipe images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete their own recipe images" on storage.objects;
create policy "users can delete their own recipe images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
