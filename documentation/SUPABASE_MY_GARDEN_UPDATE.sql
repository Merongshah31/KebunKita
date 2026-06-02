-- KebunKita My Garden database update
-- Use this in Supabase SQL Editor if your database was already created with
-- the older smart-farming schema.

-- ---------------------------------------------------------------------------
-- plants table: add the new My Garden fields
-- ---------------------------------------------------------------------------

alter table public.plants add column if not exists community_id uuid;
alter table public.plants add column if not exists category text default 'vegetable';
alter table public.plants add column if not exists image_url text;
alter table public.plants add column if not exists planted_date date;
alter table public.plants add column if not exists location text;
alter table public.plants add column if not exists sunlight text;
alter table public.plants add column if not exists watering_frequency text;
alter table public.plants add column if not exists growth_percentage integer default 0;
alter table public.plants add column if not exists estimated_harvest_date date;
alter table public.plants add column if not exists status text default 'active';

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'plant_type') then
    update public.plants set category = coalesce(category, plant_type) where category is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'photo_url') then
    update public.plants set image_url = coalesce(image_url, photo_url) where image_url is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'date_planted') then
    update public.plants set planted_date = coalesce(planted_date, date_planted) where planted_date is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'garden_location') then
    update public.plants set location = coalesce(location, garden_location) where location is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'sunlight_requirement') then
    update public.plants set sunlight = coalesce(sunlight, sunlight_requirement) where sunlight is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plants' and column_name = 'growth_percent') then
    update public.plants set growth_percentage = coalesce(growth_percentage, growth_percent) where growth_percentage is null;
  end if;
end $$;

update public.plants
set category = lower(replace(coalesce(category, 'vegetable'), ' ', '_'));

update public.plants
set sunlight = case lower(replace(coalesce(sunlight, ''), ' ', '_'))
  when 'full_sun' then 'full_sun'
  when 'partial' then 'partial_shade'
  when 'partial_shade' then 'partial_shade'
  when 'shade' then 'shade'
  else null
end;

update public.plants
set watering_frequency = case lower(replace(coalesce(watering_frequency, ''), ' ', '_'))
  when 'daily' then 'daily'
  when 'every_2_days' then 'every_2_days'
  when 'weekly' then 'weekly'
  else watering_frequency
end;

create index if not exists plants_user_id_idx on public.plants(user_id);
create index if not exists plants_community_id_idx on public.plants(community_id);
create index if not exists plants_status_idx on public.plants(status);

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communities')
    and not exists (select 1 from pg_constraint where conname = 'plants_community_id_fkey')
  then
    alter table public.plants
      add constraint plants_community_id_fkey
      foreign key (community_id) references public.communities(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- New care tables
-- ---------------------------------------------------------------------------

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

-- Optional data copy from the older care_history table.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'care_history') then
    insert into public.care_logs (plant_id, action_type, note, created_at)
    select
      plant_id,
      case
        when action_type in ('watered', 'fertilized', 'inspected', 'diagnosed') then action_type
        else 'note'
      end,
      coalesce(notes, amount),
      coalesce(recorded_at, created_at, now())
    from public.care_history
    where plant_id is not null
    on conflict do nothing;
  end if;
end $$;

-- Optional data copy from older care_tasks where a plant_id exists.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'care_tasks') then
    insert into public.care_reminders (plant_id, reminder_type, due_time, status, created_at)
    select
      plant_id,
      'custom',
      coalesce(due_at, created_at, now()),
      case when status in ('pending', 'done', 'skipped', 'expired') then status else 'pending' end,
      coalesce(created_at, now())
    from public.care_tasks
    where plant_id is not null
    on conflict do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------

alter table public.care_logs enable row level security;
alter table public.care_reminders enable row level security;

drop policy if exists "users can manage care logs for own plants" on public.care_logs;
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

drop policy if exists "users can manage reminders for own plants" on public.care_reminders;
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

-- ---------------------------------------------------------------------------
-- Marketplace chat tables for live community communication
-- ---------------------------------------------------------------------------

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  marketplace_item_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketplace_item_id, buyer_id, seller_id)
);

drop trigger if exists chat_rooms_set_updated_at on public.chat_rooms;
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

alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;

drop policy if exists "marketplace participants can read chat rooms" on public.chat_rooms;
create policy "marketplace participants can read chat rooms"
on public.chat_rooms for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can create their chat rooms" on public.chat_rooms;
create policy "buyers can create their chat rooms"
on public.chat_rooms for insert
with check (auth.uid() = buyer_id);

drop policy if exists "chat participants can update chat rooms" on public.chat_rooms;
create policy "chat participants can update chat rooms"
on public.chat_rooms for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "chat participants can read messages" on public.messages;
create policy "chat participants can read messages"
on public.messages for select
using (
  exists (
    select 1 from public.chat_rooms
    where chat_rooms.id = messages.chat_room_id
      and (chat_rooms.buyer_id = auth.uid() or chat_rooms.seller_id = auth.uid())
  )
);

drop policy if exists "chat participants can send messages" on public.messages;
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

drop policy if exists "chat participants can update read state" on public.messages;
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
