-- ==============================================================================
-- Supabase Schema: Google Auth User Profiles for Mock Preparation AI
-- ==============================================================================
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/ptggcxbqtekcgmllklvi
-- 2. Click "SQL Editor" in the left sidebar -> "New query"
-- 3. Paste this entire script and click "Run" (Ctrl + Enter)
-- ==============================================================================

-- 1. Create the 'profiles' table in public schema
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_sign_in_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Set up access policies
drop policy if exists "Allow logged in users to read profiles" on public.profiles;
create policy "Allow logged in users to read profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Allow users to update own profile" on public.profiles;
create policy "Allow users to update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Create trigger function to auto-sync Google user data from auth.users
create or replace function public.handle_google_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    last_sign_in_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 5. Attach trigger to Supabase auth.users table
drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
  after insert or update on auth.users
  for each row execute procedure public.handle_google_user();
