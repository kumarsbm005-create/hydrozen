-- HYDROZEN Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (category in ('ChatGPT', 'Midjourney', 'Stable Diffusion', 'Grok', 'Flux')),
  prompt text not null check (char_length(prompt) >= 20),
  tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_likes (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, user_id)
);

create table if not exists public.prompt_bookmarks (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prompt_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
before update on public.prompts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.prompts_with_counts as
select
  p.id,
  p.user_id,
  p.title,
  p.category,
  p.prompt,
  p.tags,
  p.image_url,
  p.created_at,
  p.updated_at,
  coalesce(pr.display_name, 'Hydrozen Creator') as creator_name,
  coalesce(pr.avatar_url, '') as creator_avatar_url,
  count(distinct pl.user_id)::int as like_count,
  count(distinct pb.user_id)::int as bookmark_count
from public.prompts p
left join public.profiles pr on pr.id = p.user_id
left join public.prompt_likes pl on pl.prompt_id = p.id
left join public.prompt_bookmarks pb on pb.prompt_id = p.id
group by p.id, pr.display_name, pr.avatar_url;

alter table public.profiles enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_likes enable row level security;
alter table public.prompt_bookmarks enable row level security;

drop policy if exists "Profiles are public readable" on public.profiles;
create policy "Profiles are public readable"
on public.profiles for select
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Prompts are public readable" on public.prompts;
create policy "Prompts are public readable"
on public.prompts for select
using (true);

drop policy if exists "Authenticated users can create prompts" on public.prompts;
create policy "Authenticated users can create prompts"
on public.prompts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own prompts" on public.prompts;
create policy "Users can update own prompts"
on public.prompts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own prompts" on public.prompts;
create policy "Users can delete own prompts"
on public.prompts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Likes are public readable" on public.prompt_likes;
create policy "Likes are public readable"
on public.prompt_likes for select
using (true);

drop policy if exists "Users can like prompts" on public.prompt_likes;
create policy "Users can like prompts"
on public.prompt_likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.prompt_likes;
create policy "Users can remove own likes"
on public.prompt_likes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Bookmarks are private readable" on public.prompt_bookmarks;
create policy "Bookmarks are private readable"
on public.prompt_bookmarks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can bookmark prompts" on public.prompt_bookmarks;
create policy "Users can bookmark prompts"
on public.prompt_bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own bookmarks" on public.prompt_bookmarks;
create policy "Users can remove own bookmarks"
on public.prompt_bookmarks for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prompt-images',
  'prompt-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Prompt images are publicly readable" on storage.objects;
create policy "Prompt images are publicly readable"
on storage.objects for select
using (bucket_id = 'prompt-images');

drop policy if exists "Authenticated users upload prompt images" on storage.objects;
create policy "Authenticated users upload prompt images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'prompt-images'
  and owner = auth.uid()
);

drop policy if exists "Users update own prompt images" on storage.objects;
create policy "Users update own prompt images"
on storage.objects for update
to authenticated
using (bucket_id = 'prompt-images' and owner = auth.uid())
with check (bucket_id = 'prompt-images' and owner = auth.uid());

drop policy if exists "Users delete own prompt images" on storage.objects;
create policy "Users delete own prompt images"
on storage.objects for delete
to authenticated
using (bucket_id = 'prompt-images' and owner = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.prompts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.prompt_likes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.prompt_bookmarks;
exception when duplicate_object then null;
end $$;

create index if not exists prompts_created_at_idx on public.prompts (created_at desc);
create index if not exists prompts_category_idx on public.prompts (category);
create index if not exists prompt_likes_prompt_id_idx on public.prompt_likes (prompt_id);
create index if not exists prompt_bookmarks_user_id_idx on public.prompt_bookmarks (user_id);
