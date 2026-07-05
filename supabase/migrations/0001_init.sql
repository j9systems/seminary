-- Seminary Hub — initial schema
-- Conventions: snake_case, uuid PKs default gen_random_uuid(), RLS on every table.

-- ────────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.classes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null default 'Seminary Class',
  teacher_name   text not null default 'Teacher',
  accent         text not null default '#5A50E6',
  radius         int  not null default 16,
  group_count    int  not null default 3,
  groups_visible boolean not null default false,
  groups_list    jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  user_id      uuid unique references auth.users(id) on delete set null,
  full_name    text not null,
  role         text not null default 'student' check (role in ('teacher','student')),
  color        text not null default '#5A50E6',
  streak_base  int  not null default 0,
  email        text,
  created_at   timestamptz not null default now()
);
create index if not exists profiles_class_idx on public.profiles(class_id);
create index if not exists profiles_user_idx  on public.profiles(user_id);

create table if not exists public.lessons (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  lesson_date    date not null,
  title          text not null default 'New lesson',
  scripture      text not null default '',
  prework        text not null default '',
  outline        text not null default '',
  manual         text not null default '',
  live           boolean not null default false,
  chat_open      boolean not null default false,
  chat_anon      boolean not null default false,
  last_revealed  int,
  created_at     timestamptz not null default now()
);
create index if not exists lessons_class_idx on public.lessons(class_id);
create index if not exists lessons_date_idx  on public.lessons(lesson_date);

create table if not exists public.focus_cards (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons(id) on delete cascade,
  card_type         text not null default 'quote' check (card_type in ('quote','scripture','activity','image')),
  title             text not null default '',
  body              text not null default '',
  author            text not null default '',
  image_url         text,
  author_image_url  text,
  visible           boolean not null default false,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists focus_cards_lesson_idx on public.focus_cards(lesson_id);

create table if not exists public.polls (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  question    text not null,
  anon        boolean not null default true,
  open        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists polls_lesson_idx on public.polls(lesson_id);

create table if not exists public.poll_options (
  id        uuid primary key default gen_random_uuid(),
  poll_id   uuid not null references public.polls(id) on delete cascade,
  label     text not null,
  position  int not null default 0
);
create index if not exists poll_options_poll_idx on public.poll_options(poll_id);

create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls(id) on delete cascade,
  option_id  uuid not null references public.poll_options(id) on delete cascade,
  voter_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);
create index if not exists poll_votes_poll_idx on public.poll_votes(poll_id);

create table if not exists public.chat_posts (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body        text not null,
  anon        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists chat_posts_lesson_idx on public.chat_posts(lesson_id);

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('p','t','a','e')),
  marked_by   uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index if not exists attendance_lesson_idx on public.attendance(lesson_id);
create index if not exists attendance_student_idx on public.attendance(student_id);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  pinned     boolean not null default false,
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_class_idx on public.announcements(class_id);

create table if not exists public.makeup_insights (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  standout   text not null default '',
  details    text not null default '',
  learn      text not null default '',
  apply      text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists makeup_insights_lesson_idx  on public.makeup_insights(lesson_id);
create index if not exists makeup_insights_student_idx on public.makeup_insights(student_id);

create table if not exists public.teacher_notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade unique,
  body       text not null default '',
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1
$$;

create or replace function public.is_class_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and class_id = cid)
$$;

create or replace function public.is_class_teacher(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and class_id = cid and role = 'teacher')
$$;

create or replace function public.is_lesson_member(lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_class_member((select class_id from public.lessons where id = lid))
$$;

create or replace function public.is_lesson_teacher(lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_class_teacher((select class_id from public.lessons where id = lid))
$$;

create or replace function public.is_poll_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_lesson_member((select lesson_id from public.polls where id = pid))
$$;

create or replace function public.is_poll_teacher(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_lesson_teacher((select lesson_id from public.polls where id = pid))
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.classes         enable row level security;
alter table public.profiles        enable row level security;
alter table public.lessons         enable row level security;
alter table public.focus_cards     enable row level security;
alter table public.polls           enable row level security;
alter table public.poll_options    enable row level security;
alter table public.poll_votes      enable row level security;
alter table public.chat_posts      enable row level security;
alter table public.attendance      enable row level security;
alter table public.announcements   enable row level security;
alter table public.makeup_insights enable row level security;
alter table public.teacher_notes   enable row level security;

-- classes
create policy classes_select on public.classes for select using (public.is_class_member(id));
create policy classes_update on public.classes for update using (public.is_class_teacher(id)) with check (public.is_class_teacher(id));

-- profiles
create policy profiles_select on public.profiles for select using (public.is_class_member(class_id) or user_id = auth.uid());
create policy profiles_update_own on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_claim on public.profiles for update using (user_id is null) with check (user_id = auth.uid());
create policy profiles_teacher_all on public.profiles for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- lessons
create policy lessons_select on public.lessons for select using (public.is_class_member(class_id));
create policy lessons_teacher_all on public.lessons for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- focus_cards (students see only revealed cards)
create policy focus_cards_select on public.focus_cards for select
  using (public.is_lesson_teacher(lesson_id) or (visible and public.is_lesson_member(lesson_id)));
create policy focus_cards_teacher_all on public.focus_cards for all
  using (public.is_lesson_teacher(lesson_id)) with check (public.is_lesson_teacher(lesson_id));

-- polls (students see only open polls)
create policy polls_select on public.polls for select
  using (public.is_lesson_teacher(lesson_id) or (open and public.is_lesson_member(lesson_id)));
create policy polls_teacher_all on public.polls for all
  using (public.is_lesson_teacher(lesson_id)) with check (public.is_lesson_teacher(lesson_id));

-- poll_options
create policy poll_options_select on public.poll_options for select using (public.is_poll_member(poll_id));
create policy poll_options_teacher_all on public.poll_options for all
  using (public.is_poll_teacher(poll_id)) with check (public.is_poll_teacher(poll_id));

-- poll_votes
create policy poll_votes_select on public.poll_votes for select using (public.is_poll_member(poll_id));
create policy poll_votes_insert on public.poll_votes for insert
  with check (voter_id = public.current_profile_id() and public.is_poll_member(poll_id));
create policy poll_votes_update_own on public.poll_votes for update
  using (voter_id = public.current_profile_id()) with check (voter_id = public.current_profile_id());
create policy poll_votes_delete_own on public.poll_votes for delete
  using (voter_id = public.current_profile_id() or public.is_poll_teacher(poll_id));

-- chat_posts
create policy chat_posts_select on public.chat_posts for select using (public.is_lesson_member(lesson_id));
create policy chat_posts_insert on public.chat_posts for insert
  with check (public.is_lesson_member(lesson_id) and author_id = public.current_profile_id());
create policy chat_posts_teacher_all on public.chat_posts for all
  using (public.is_lesson_teacher(lesson_id)) with check (public.is_lesson_teacher(lesson_id));

-- attendance (student sees own; teacher manages all)
create policy attendance_select on public.attendance for select
  using (public.is_lesson_teacher(lesson_id) or student_id = public.current_profile_id());
create policy attendance_teacher_all on public.attendance for all
  using (public.is_lesson_teacher(lesson_id)) with check (public.is_lesson_teacher(lesson_id));

-- announcements
create policy announcements_select on public.announcements for select using (public.is_class_member(class_id));
create policy announcements_teacher_all on public.announcements for all
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- makeup_insights (student manages own; teacher reads all)
create policy makeup_select on public.makeup_insights for select
  using (public.is_lesson_teacher(lesson_id) or student_id = public.current_profile_id());
create policy makeup_insert on public.makeup_insights for insert
  with check (student_id = public.current_profile_id() and public.is_lesson_member(lesson_id));
create policy makeup_update_own on public.makeup_insights for update
  using (student_id = public.current_profile_id()) with check (student_id = public.current_profile_id());
create policy makeup_teacher_all on public.makeup_insights for all
  using (public.is_lesson_teacher(lesson_id)) with check (public.is_lesson_teacher(lesson_id));

-- teacher_notes (teacher only)
create policy teacher_notes_all on public.teacher_notes for all
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime
-- ────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.lessons;
alter publication supabase_realtime add table public.focus_cards;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_options;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.chat_posts;
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.announcements;
