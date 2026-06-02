-- KebunKita Supabase Schema
-- Run this in Supabase SQL Editor.
-- Supabase remains the main backend: Auth + PostgreSQL Database + Storage.
-- Firebase Cloud Messaging is used only for push notifications.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core users and temporary guest usage
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  avatar_url text,
  access_type text not null default 'guest'
    check (access_type in ('guest', 'free', 'premium', 'admin')),
  provider text default 'guest'
    check (provider in ('email', 'google', 'facebook', 'guest')),
  is_guest boolean not null default true,
  guest_expires_at timestamptz,
  location_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create index if not exists users_email_idx on public.users(email);
create index if not exists users_access_type_idx on public.users(access_type);
create index if not exists users_is_guest_idx on public.users(is_guest);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    avatar_url,
    access_type,
    provider,
    is_guest
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'free',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
        is_guest = false,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.guest_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  function_name text not null,
  activity_name text not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, function_name, activity_name)
);

create trigger guest_usage_set_updated_at
before update on public.guest_usage
for each row execute function public.set_updated_at();

create index if not exists guest_usage_user_id_idx on public.guest_usage(user_id);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  fcm_token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger device_tokens_set_updated_at
before update on public.device_tokens
for each row execute function public.set_updated_at();

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);
create index if not exists device_tokens_is_active_idx on public.device_tokens(is_active);

-- ---------------------------------------------------------------------------
-- Garden and plant care
-- ---------------------------------------------------------------------------

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  community_id uuid,
  name text not null,
  category text not null
    check (category in ('vegetable', 'fruit', 'herb', 'leafy_green', 'flower', 'other')),
  image_url text,
  planted_date date,
  location text,
  sunlight text
    check (sunlight is null or sunlight in ('full_sun', 'partial_shade', 'shade')),
  watering_frequency text
    check (watering_frequency is null or watering_frequency in ('daily', 'every_2_days', 'weekly')),
  growth_percentage integer not null default 0 check (growth_percentage >= 0 and growth_percentage <= 100),
  estimated_harvest_date date,
  status text not null default 'active'
    check (status in ('active', 'harvested', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plants_set_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

create index if not exists plants_user_id_idx on public.plants(user_id);
create index if not exists plants_community_id_idx on public.plants(community_id);
create index if not exists plants_status_idx on public.plants(status);

create table if not exists public.plant_media (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists plant_media_plant_id_idx on public.plant_media(plant_id);
create index if not exists plant_media_user_id_idx on public.plant_media(user_id);

create table if not exists public.care_logs (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  action_type text not null
    check (action_type in ('watered', 'fertilized', 'note', 'inspected', 'diagnosed')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists care_logs_plant_id_idx on public.care_logs(plant_id);
create index if not exists care_logs_action_type_idx on public.care_logs(action_type);
create index if not exists care_logs_created_at_idx on public.care_logs(created_at);

create table if not exists public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  reminder_type text not null
    check (reminder_type in ('water', 'fertilizer', 'inspection', 'harvest', 'custom')),
  due_time timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'done', 'skipped', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists care_reminders_plant_id_idx on public.care_reminders(plant_id);
create index if not exists care_reminders_due_time_idx on public.care_reminders(due_time);
create index if not exists care_reminders_status_idx on public.care_reminders(status);

create table if not exists public.plant_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  image_url text,
  status text not null check (status in ('healthy', 'diseased', 'unknown')),
  disease_name text,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  symptoms jsonb not null default '[]'::jsonb,
  treatment_plan jsonb not null default '[]'::jsonb,
  recommendation text,
  ai_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists plant_diagnoses_user_id_idx on public.plant_diagnoses(user_id);
create index if not exists plant_diagnoses_plant_id_idx on public.plant_diagnoses(plant_id);
create index if not exists plant_diagnoses_status_idx on public.plant_diagnoses(status);

-- ---------------------------------------------------------------------------
-- Communities and feed
-- ---------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  area text,
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  image_url text,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger communities_set_updated_at
before update on public.communities
for each row execute function public.set_updated_at();

create index if not exists communities_created_by_idx on public.communities(created_by);
create index if not exists communities_visibility_idx on public.communities(visibility);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plants_community_id_fkey'
  ) then
    alter table public.plants
      add constraint plants_community_id_fkey
      foreign key (community_id) references public.communities(id) on delete set null;
  end if;
end $$;

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active'
    check (status in ('active', 'pending', 'blocked')),
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists community_members_community_id_idx on public.community_members(community_id);
create index if not exists community_members_user_id_idx on public.community_members(user_id);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  post_type text not null
    check (post_type in ('harvest', 'question', 'advice', 'progress', 'tip')),
  body text not null,
  plant_id uuid references public.plants(id) on delete set null,
  location_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

create index if not exists community_posts_user_id_idx on public.community_posts(user_id);
create index if not exists community_posts_community_id_idx on public.community_posts(community_id);
create index if not exists community_posts_post_type_idx on public.community_posts(post_type);
create index if not exists community_posts_created_at_idx on public.community_posts(created_at);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_id_idx on public.post_media(post_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  comment_type text not null default 'comment'
    check (comment_type in ('comment', 'solution')),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx on public.post_comments(post_id);
create index if not exists post_comments_user_id_idx on public.post_comments(user_id);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'save')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction_type)
);

create index if not exists post_reactions_post_id_idx on public.post_reactions(post_id);
create index if not exists post_reactions_user_id_idx on public.post_reactions(user_id);

-- ---------------------------------------------------------------------------
-- Marketplace, barter, and chat
-- ---------------------------------------------------------------------------

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  crop_name text not null,
  description text,
  quantity text,
  price_amount numeric,
  price_unit text,
  listing_type text not null default 'barter'
    check (listing_type in ('sell', 'barter', 'both')),
  location_text text,
  is_organic boolean not null default false,
  is_pesticide_free boolean not null default false,
  harvested_at date,
  status text not null default 'active'
    check (status in ('active', 'reserved', 'traded', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger marketplace_listings_set_updated_at
before update on public.marketplace_listings
for each row execute function public.set_updated_at();

create index if not exists marketplace_listings_status_idx on public.marketplace_listings(status);
create index if not exists marketplace_listings_user_id_idx on public.marketplace_listings(user_id);
create index if not exists marketplace_listings_crop_name_idx on public.marketplace_listings(crop_name);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_id_idx on public.listing_media(listing_id);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  requester_id uuid not null references public.users(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  offered_plant_id uuid references public.plants(id) on delete set null,
  offered_title text not null,
  requested_title text not null,
  message text,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trades_set_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

create index if not exists trades_requester_id_idx on public.trades(requester_id);
create index if not exists trades_owner_id_idx on public.trades(owner_id);
create index if not exists trades_status_idx on public.trades(status);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  marketplace_item_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketplace_item_id, buyer_id, seller_id)
);

create trigger chat_rooms_set_updated_at
before update on public.chat_rooms
for each row execute function public.set_updated_at();

create index if not exists chat_rooms_marketplace_item_id_idx on public.chat_rooms(marketplace_item_id);
create index if not exists chat_rooms_buyer_id_idx on public.chat_rooms(buyer_id);
create index if not exists chat_rooms_seller_id_idx on public.chat_rooms(seller_id);
create index if not exists chat_rooms_updated_at_idx on public.chat_rooms(updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_room_id_created_at_idx on public.messages(chat_room_id, created_at);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_is_read_idx on public.messages(is_read);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references public.trades(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete set null,
  body text,
  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'barter_offer', 'system')),
  media_url text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_trade_id_created_idx on public.chat_messages(trade_id, created_at);
create index if not exists chat_messages_sender_id_idx on public.chat_messages(sender_id);
create index if not exists chat_messages_receiver_id_idx on public.chat_messages(receiver_id);

-- ---------------------------------------------------------------------------
-- Agent memory and notifications
-- ---------------------------------------------------------------------------

create table if not exists public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  agent_name text not null
    check (agent_name in ('plant_health', 'smart_farming', 'community_exchange', 'decision_support')),
  payload jsonb not null default '{}'::jsonb,
  summary text,
  vector_id text,
  created_at timestamptz not null default now()
);

create index if not exists memory_entries_user_id_idx on public.memory_entries(user_id);
create index if not exists memory_entries_agent_name_idx on public.memory_entries(agent_name);
create index if not exists memory_entries_payload_gin_idx on public.memory_entries using gin(payload);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  agent_name text not null,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  status text not null default 'success'
    check (status in ('success', 'failed', 'fallback')),
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists agent_runs_user_id_idx on public.agent_runs(user_id);
create index if not exists agent_runs_agent_name_idx on public.agent_runs(agent_name);
create index if not exists agent_runs_status_idx on public.agent_runs(status);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device_token_id uuid references public.device_tokens(id) on delete set null,
  notification_type text not null
    check (notification_type in ('care_reminder', 'trade_update', 'community', 'system')),
  title text not null,
  body text not null,
  related_table text,
  related_id uuid,
  fcm_message_id text,
  error_message text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'read', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_status_idx on public.notifications(status);
create index if not exists notifications_scheduled_at_idx on public.notifications(scheduled_at);

-- ---------------------------------------------------------------------------
-- Supabase Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('plant-images', 'plant-images', true),
  ('community-media', 'community-media', true),
  ('marketplace-media', 'marketplace-media', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.guest_usage enable row level security;
alter table public.device_tokens enable row level security;
alter table public.plants enable row level security;
alter table public.plant_media enable row level security;
alter table public.care_logs enable row level security;
alter table public.care_reminders enable row level security;
alter table public.plant_diagnoses enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.trades enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.chat_messages enable row level security;
alter table public.memory_entries enable row level security;
alter table public.agent_runs enable row level security;
alter table public.notifications enable row level security;

-- Basic MVP policies.
-- These assume authenticated Supabase users have the same id in public.users.
-- Guest rows can be created/managed by backend service role.

create policy "users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users can manage own device tokens"
on public.device_tokens for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read own guest usage"
on public.guest_usage for select
using (auth.uid() = user_id);

create policy "users can manage own plants"
on public.plants for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can manage own plant media"
on public.plant_media for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can manage care logs for own plants"
on public.care_logs for all
using (
  exists (
    select 1 from public.plants
    where plants.id = care_logs.plant_id
      and plants.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.plants
    where plants.id = care_logs.plant_id
      and plants.user_id = auth.uid()
  )
);

create policy "users can manage reminders for own plants"
on public.care_reminders for all
using (
  exists (
    select 1 from public.plants
    where plants.id = care_reminders.plant_id
      and plants.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.plants
    where plants.id = care_reminders.plant_id
      and plants.user_id = auth.uid()
  )
);

create policy "users can manage own diagnoses"
on public.plant_diagnoses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "public can read public communities"
on public.communities for select
using (visibility = 'public' or created_by = auth.uid());

create policy "users can create communities"
on public.communities for insert
with check (auth.uid() = created_by);

create policy "community creators can update communities"
on public.communities for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "users can read community members"
on public.community_members for select
using (true);

create policy "users can manage own membership"
on public.community_members for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read community posts"
on public.community_posts for select
using (true);

create policy "users can manage own community posts"
on public.community_posts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read post media"
on public.post_media for select
using (true);

create policy "users can read comments"
on public.post_comments for select
using (true);

create policy "users can create own comments"
on public.post_comments for insert
with check (auth.uid() = user_id);

create policy "users can manage own reactions"
on public.post_reactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read active listings"
on public.marketplace_listings for select
using (status = 'active' or auth.uid() = user_id);

create policy "users can manage own listings"
on public.marketplace_listings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read listing media"
on public.listing_media for select
using (true);

create policy "trade participants can read trades"
on public.trades for select
using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "users can create requested trades"
on public.trades for insert
with check (auth.uid() = requester_id);

create policy "trade participants can update trades"
on public.trades for update
using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "marketplace participants can read chat rooms"
on public.chat_rooms for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "buyers can create their chat rooms"
on public.chat_rooms for insert
with check (auth.uid() = buyer_id);

create policy "chat participants can update chat rooms"
on public.chat_rooms for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "chat participants can read messages"
on public.messages for select
using (
  exists (
    select 1 from public.chat_rooms
    where chat_rooms.id = messages.chat_room_id
      and (chat_rooms.buyer_id = auth.uid() or chat_rooms.seller_id = auth.uid())
  )
);

create policy "chat participants can send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.chat_rooms
    where chat_rooms.id = messages.chat_room_id
      and (chat_rooms.buyer_id = auth.uid() or chat_rooms.seller_id = auth.uid())
  )
);

create policy "chat participants can update read state"
on public.messages for update
using (
  exists (
    select 1 from public.chat_rooms
    where chat_rooms.id = messages.chat_room_id
      and (chat_rooms.buyer_id = auth.uid() or chat_rooms.seller_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.chat_rooms
    where chat_rooms.id = messages.chat_room_id
      and (chat_rooms.buyer_id = auth.uid() or chat_rooms.seller_id = auth.uid())
  )
);

create policy "trade participants can read messages"
on public.chat_messages for select
using (
  auth.uid() = sender_id
  or auth.uid() = receiver_id
  or exists (
    select 1 from public.trades t
    where t.id = chat_messages.trade_id
      and (t.requester_id = auth.uid() or t.owner_id = auth.uid())
  )
);

create policy "users can send own messages"
on public.chat_messages for insert
with check (auth.uid() = sender_id);

create policy "users can read own memory"
on public.memory_entries for select
using (auth.uid() = user_id);

create policy "users can read own notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Storage read policies for public buckets.
create policy "public can read plant images"
on storage.objects for select
using (bucket_id = 'plant-images');

create policy "public can read community media"
on storage.objects for select
using (bucket_id = 'community-media');

create policy "public can read marketplace media"
on storage.objects for select
using (bucket_id = 'marketplace-media');

create policy "public can read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
