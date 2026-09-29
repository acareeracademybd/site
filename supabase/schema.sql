-- =====================================================================
--  ACCOUNTING CAREER ACADEMY — Supabase database schema
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
--  (It is safe to run again later; it will not delete your data.)
--
--  Contents
--   1. Tables
--   2. Helper functions (who is admin / which student is logged in)
--   3. Row Level Security (who can read / change what)
--   4. Public functions (payment form, contact form, curriculum)
--   5. Student functions (login, dashboard, course player, downloads)
--   6. Admin functions (approve payment, generate access code, stats)
--   7. File storage buckets + security rules
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text not null check (char_length(email) between 3 and 200 and email ~ '^[^@\s"'',]+@[^@\s"'',]+\.[^@\s"'',]+$'),
  mobile     text check (mobile is null or char_length(mobile) <= 20),
  status     text not null default 'active' check (status in ('active','inactive')),
  notes      text,
  -- Reserved for a future normal password login (Supabase Auth user id)
  auth_user_id uuid,
  joined_at  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists students_email_key on public.students (lower(email));

create table if not exists public.courses (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null,
  short_description text,
  full_description  text,
  thumbnail_url     text,
  price             numeric(10,2) not null default 0 check (price >= 0),
  old_price         numeric(10,2) check (old_price is null or old_price >= 0),
  duration          text,
  course_type       text not null default 'recorded' check (course_type in ('live','recorded')),
  instructor        text,
  level             text,
  who_should_join   text,      -- one item per line
  what_you_learn    text,      -- one item per line
  benefits          text,      -- one item per line (shown on featured card)
  schedule_days     text,      -- LIVE only, e.g. "Friday & Saturday"
  class_time        text,      -- LIVE only, e.g. "8:00 PM – 10:00 PM"
  start_date        date,      -- LIVE only
  platform          text,      -- LIVE only, e.g. "Zoom"
  preview_video_url text,      -- free preview (YouTube link)
  is_featured       boolean not null default false,
  status            text not null default 'draft' check (status in ('draft','published')),
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists course_modules_course_idx on public.course_modules(course_id);

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  module_id     uuid not null references public.course_modules(id) on delete cascade,
  title         text not null,
  description   text,
  video_url     text,
  duration      text,
  material_path text,          -- private file in "course-files" bucket
  material_name text,
  is_free       boolean not null default false,
  drip_days     int not null default 0 check (drip_days >= 0), -- future drip content: unlock N days after enrolment
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons(course_id);
create index if not exists lessons_module_idx on public.lessons(module_id);

create table if not exists public.course_faqs (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  question   text not null,
  answer     text not null,
  sort_order int not null default 0
);
create index if not exists course_faqs_course_idx on public.course_faqs(course_id);

create table if not exists public.live_classes (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  class_date   date,
  start_time   text,
  platform     text,
  meeting_link text,
  meeting_id   text,
  passcode     text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists live_classes_course_idx on public.live_classes(course_id);

create table if not exists public.ebooks (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null,
  short_description text,
  description       text,
  author            text,
  pages             int check (pages is null or pages >= 0),
  price             numeric(10,2) not null default 0 check (price >= 0),
  old_price         numeric(10,2),
  cover_url         text,
  sample_url        text,      -- PUBLIC sample/preview PDF (optional)
  is_featured       boolean not null default false,
  status            text not null default 'draft' check (status in ('draft','published')),
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- The paid PDF location is kept in its own admin-only table
create table if not exists public.ebook_files (
  ebook_id   uuid primary key references public.ebooks(id) on delete cascade,
  file_path  text not null,
  file_name  text,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid references public.students(id) on delete set null,
  name           text not null,
  email          text not null,
  mobile         text not null,
  product_type   text not null check (product_type in ('course','ebook')),
  course_id      uuid references public.courses(id) on delete set null,
  ebook_id       uuid references public.ebooks(id) on delete set null,
  product_title  text not null,
  amount         numeric(10,2) not null default 0,
  method         text not null check (method in ('bkash','nagad','free','other')),
  sender_number  text,
  transaction_id text not null,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note     text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid
);
create index if not exists payments_status_idx on public.payments(status, created_at desc);
create index if not exists payments_email_idx on public.payments(lower(email), created_at desc);
create unique index if not exists payments_trx_unique
  on public.payments (method, upper(transaction_id))
  where status <> 'rejected' and method in ('bkash','nagad');

create table if not exists public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  status     text not null default 'active' check (status in ('active','inactive')),
  expires_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create index if not exists enrollments_student_idx on public.enrollments(student_id);

create table if not exists public.ebook_purchases (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ebook_id   uuid not null references public.ebooks(id) on delete cascade,
  status     text not null default 'active' check (status in ('active','inactive')),
  expires_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, ebook_id)
);
create index if not exists ebook_purchases_student_idx on public.ebook_purchases(student_id);

create table if not exists public.access_codes (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  code_hash    text not null unique,     -- only a SHA-256 fingerprint is stored, never the code itself
  code_hint    text not null,            -- last 4 characters, to help the admin recognise a code
  course_id    uuid references public.courses(id) on delete set null,
  ebook_id     uuid references public.ebooks(id) on delete set null,
  status       text not null default 'active' check (status in ('active','inactive')),
  expires_at   timestamptz,
  last_used_at timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now()
);
create index if not exists access_codes_student_idx on public.access_codes(student_id);

-- One row per logged-in browser/device of a student
create table if not exists public.student_sessions (
  auth_uid       uuid primary key,
  student_id     uuid not null references public.students(id) on delete cascade,
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index if not exists student_sessions_student_idx on public.student_sessions(student_id);

create table if not exists public.login_attempts (
  id           bigserial primary key,
  email        text not null,
  success      boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on public.login_attempts(email, attempted_at desc);

create table if not exists public.lesson_progress (
  student_id   uuid not null references public.students(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table if not exists public.blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null,
  featured_image    text,
  category          text not null default 'Accounting',
  short_description text,
  content           text,
  author            text,
  published_at      date not null default current_date,
  status            text not null default 'draft' check (status in ('draft','published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  designation text,
  message     text not null,
  photo_url   text,
  rating      int not null default 5 check (rating between 1 and 5),
  status      text not null default 'published' check (status in ('draft','published')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- "Why learn with us" items
create table if not exists public.features (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  icon        text not null default 'check',
  status      text not null default 'published' check (status in ('draft','published')),
  sort_order  int not null default 0
);

create table if not exists public.website_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  mobile     text,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- updated_at + e-mail normalisation triggers
create or replace function public._touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create or replace function public._normalize_email() returns trigger
language plpgsql as $$ begin new.email := lower(trim(new.email)); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['students','courses','ebooks','blog_posts'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public._touch_updated_at()', t);
  end loop;
  foreach t in array array['students','payments'] loop
    execute format('drop trigger if exists normalize_email on public.%I', t);
    execute format('create trigger normalize_email before insert or update of email on public.%I for each row execute function public._normalize_email()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ---------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Which student is using this browser? NULL if none / blocked / code expired.
create or replace function public.current_student_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select ss.student_id
  from public.student_sessions ss
  join public.students st     on st.id = ss.student_id
  join public.access_codes ac on ac.id = ss.access_code_id
  where ss.auth_uid = auth.uid()
    and st.status = 'active'
    and ac.status = 'active'
    and (ac.expires_at is null or ac.expires_at > now())
  limit 1;
$$;

create or replace function public.has_course(p_course_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = public.current_student_id()
      and e.course_id = p_course_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now()));
$$;

create or replace function public.has_ebook(p_ebook_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.ebook_purchases p
    where p.student_id = public.current_student_id()
      and p.ebook_id = p_ebook_id
      and p.status = 'active'
      and (p.expires_at is null or p.expires_at > now()));
$$;

-- Drip content: is a lesson with "unlock after N days" open for the current student?
create or replace function public.drip_open(p_course_id uuid, p_drip_days int) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_drip_days <= 0 or exists (
    select 1 from public.enrollments e
    where e.student_id = public.current_student_id() and e.course_id = p_course_id
      and e.created_at + make_interval(days => p_drip_days) <= now());
$$;

-- First folder of a storage path as uuid ("<uuid>/file.pdf" → uuid), else NULL
create or replace function public._folder_uuid(p_name text) returns uuid
language sql immutable set search_path = public, pg_temp as $$
  select case when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

create or replace function public._hash_code(p_code text) returns text
language sql immutable set search_path = public, extensions, pg_temp as $$
  select encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
$$;

-- Accepts "aca 2026 x7k9 pq4m", "ACA2026X7K9PQ4M" etc. and returns ACA-2026-X7K9-PQ4M
create or replace function public._canonical_code(p_code text) returns text
language plpgsql immutable set search_path = public, pg_temp as $$
declare v text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
begin
  if length(v) = 15 and left(v, 3) = 'ACA' then
    return 'ACA-' || substr(v, 4, 4) || '-' || substr(v, 8, 4) || '-' || substr(v, 12, 4);
  end if;
  return upper(trim(coalesce(p_code,'')));
end $$;

-- Random, unique code like ACA-2026-X7K9-PQ4M (no 0/O/1/I to avoid confusion)
create or replace function public._new_access_code() returns text
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea; c text; i int;
begin
  loop
    b := extensions.gen_random_bytes(8);
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
      if i = 3 then c := c || '-'; end if;
    end loop;
    c := 'ACA-' || to_char(now(), 'YYYY') || '-' || c;
    exit when not exists (select 1 from public.access_codes where code_hash = public._hash_code(c));
  end loop;
  return c;
end $$;

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['admins','students','courses','course_modules','lessons','course_faqs',
    'live_classes','ebooks','ebook_files','payments','enrollments','ebook_purchases','access_codes',
    'student_sessions','login_attempts','lesson_progress','blog_posts','testimonials','features',
    'website_settings','contact_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Admin can do everything on every table (except admins table, see below)
    execute format('drop policy if exists "admin full access" on public.%I', t);
    if t <> 'admins' then
      execute format('create policy "admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- admins: an admin can see the admin list; nobody can change it from the website
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Public content (only published rows)
drop policy if exists "public read published" on public.courses;
create policy "public read published" on public.courses for select using (status = 'published');

drop policy if exists "public read modules" on public.course_modules;
create policy "public read modules" on public.course_modules for select
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
         or public.has_course(course_id));

drop policy if exists "public read faqs" on public.course_faqs;
create policy "public read faqs" on public.course_faqs for select
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));

-- lessons: free lessons of published courses are public; paid lessons only for enrolled students
drop policy if exists "lesson access" on public.lessons;
create policy "lesson access" on public.lessons for select
  using ((is_free and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'))
         or (public.has_course(course_id) and public.drip_open(course_id, drip_days)));

drop policy if exists "public read published" on public.ebooks;
create policy "public read published" on public.ebooks for select using (status = 'published');

drop policy if exists "public read published" on public.blog_posts;
create policy "public read published" on public.blog_posts for select using (status = 'published');

drop policy if exists "public read published" on public.testimonials;
create policy "public read published" on public.testimonials for select using (status = 'published');

drop policy if exists "public read published" on public.features;
create policy "public read published" on public.features for select using (status = 'published');

drop policy if exists "public read settings" on public.website_settings;
create policy "public read settings" on public.website_settings for select using (true);

-- Student's own data
drop policy if exists "student own profile" on public.students;
create policy "student own profile" on public.students for select to authenticated
  using (id = public.current_student_id());

drop policy if exists "student own enrollments" on public.enrollments;
create policy "student own enrollments" on public.enrollments for select to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "student own ebooks" on public.ebook_purchases;
create policy "student own ebooks" on public.ebook_purchases for select to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "student own payments" on public.payments;
create policy "student own payments" on public.payments for select to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "student own progress" on public.lesson_progress;
create policy "student own progress" on public.lesson_progress for select to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "enrolled live classes" on public.live_classes;
create policy "enrolled live classes" on public.live_classes for select to authenticated
  using (public.has_course(course_id));

-- ebook_files, access_codes, student_sessions, login_attempts, contact_messages:
-- no public policy at all → only admin (and the secure functions below) can read them.

-- ---------------------------------------------------------------------
-- 4. PUBLIC FUNCTIONS (no login needed)
-- ---------------------------------------------------------------------

-- Course curriculum for the public course page (titles only; video only for free lessons)
create or replace function public.get_curriculum(p_course_id uuid) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(m order by m.sort_order, m.title), '[]'::json) from (
    select cm.id, cm.title, cm.description, cm.sort_order,
      (select coalesce(json_agg(json_build_object(
                'id', l.id, 'title', l.title, 'duration', l.duration, 'is_free', l.is_free,
                'video_url', case when l.is_free then l.video_url end)
              order by l.sort_order, l.created_at), '[]'::json)
         from public.lessons l where l.module_id = cm.id) as lessons
    from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.course_id = p_course_id and (c.status = 'published' or public.is_admin())
  ) m;
$$;

-- Payment form ("I Have Made Payment")
create or replace function public.submit_payment(
  p_name text, p_email text, p_mobile text, p_product_type text, p_product_id uuid,
  p_method text, p_transaction_id text, p_sender_number text default null
) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_name  text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_mob   text := regexp_replace(coalesce(p_mobile, ''), '[^0-9+]', '', 'g');
  v_trx   text := upper(trim(coalesce(p_transaction_id, '')));
  v_title text; v_price numeric; v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'Please enter your full name.'; end if;
  if v_email !~ '^[^@\s"'',]+@[^@\s"'',]+\.[^@\s"'',]+$' or char_length(v_email) > 200 then raise exception 'Please enter a valid email address.'; end if;
  if v_mob !~ '^(\+?880|0)?1[3-9][0-9]{8}$' then raise exception 'Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).'; end if;
  if p_method not in ('bkash','nagad','free') then raise exception 'Please choose a payment method.'; end if;

  if p_product_type = 'course' then
    select title, price into v_title, v_price from public.courses where id = p_product_id and status = 'published';
  elsif p_product_type = 'ebook' then
    select title, price into v_title, v_price from public.ebooks where id = p_product_id and status = 'published';
  end if;
  if v_title is null then raise exception 'This course/e-book is not available.'; end if;

  if p_method = 'free' then
    if v_price > 0 then raise exception 'Please choose bKash or Nagad.'; end if;
    v_trx := 'FREE-' || to_char(now(), 'YYYYMMDDHH24MISS');
  elsif v_trx !~ '^[A-Z0-9]{6,30}$' then
    raise exception 'Please enter the Transaction ID exactly as shown in your bKash/Nagad message.';
  end if;

  -- simple abuse protection
  if (select count(*) from public.payments where lower(email) = v_email and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many submissions today. Please contact us on WhatsApp.';
  end if;
  if (select count(*) from public.payments where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'The system is busy. Please try again in a few minutes.';
  end if;
  if p_method <> 'free' and exists (select 1 from public.payments
      where method = p_method and upper(transaction_id) = v_trx and status <> 'rejected') then
    raise exception 'This Transaction ID has already been submitted. Please contact us on WhatsApp if this is a mistake.';
  end if;

  insert into public.payments (name, email, mobile, product_type, course_id, ebook_id, product_title,
                               amount, method, sender_number, transaction_id)
  values (v_name, v_email, v_mob, p_product_type,
          case when p_product_type = 'course' then p_product_id end,
          case when p_product_type = 'ebook' then p_product_id end,
          v_title, v_price, p_method, left(nullif(trim(coalesce(p_sender_number, '')), ''), 20), v_trx)
  returning id into v_id;

  return json_build_object('id', v_id, 'product_title', v_title, 'amount', v_price, 'transaction_id', v_trx);
end $$;

-- Contact form
create or replace function public.submit_contact(p_name text, p_email text, p_mobile text, p_message text)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 120 then raise exception 'Please enter your name.'; end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email address.'; end if;
  if char_length(trim(coalesce(p_message, ''))) < 5 or char_length(p_message) > 3000 then raise exception 'Please write a message (5–3000 characters).'; end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many messages right now. Please try again later or use WhatsApp.';
  end if;
  insert into public.contact_messages (name, email, mobile, message)
  values (trim(p_name), nullif(v_email, ''), left(nullif(trim(coalesce(p_mobile, '')), ''), 20), trim(p_message));
  return true;
end $$;

-- ---------------------------------------------------------------------
-- 5. STUDENT FUNCTIONS
-- ---------------------------------------------------------------------

-- Email + access code login. The browser first gets an anonymous Supabase
-- session; this function links that session to the student if the code is valid.
create or replace function public.student_login(p_email text, p_code text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code  text := public._canonical_code(p_code);
  v_uid   uuid := auth.uid();
  v_student public.students%rowtype;
  v_code_id uuid;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'no_session');
  end if;
  if (select count(*) from public.login_attempts
       where email = v_email and not success and attempted_at > now() - interval '15 minutes') >= 5 then
    return json_build_object('ok', false, 'error', 'too_many');
  end if;

  select * into v_student from public.students where lower(email) = v_email;
  if found then
    select id into v_code_id from public.access_codes
     where student_id = v_student.id and code_hash = public._hash_code(v_code)
       and status = 'active' and (expires_at is null or expires_at > now());
  end if;

  if v_code_id is null then
    insert into public.login_attempts (email, success) values (v_email, false);
    delete from public.login_attempts where attempted_at < now() - interval '2 days';
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_student.status <> 'active' then
    return json_build_object('ok', false, 'error', 'inactive');
  end if;

  insert into public.login_attempts (email, success) values (v_email, true);
  delete from public.student_sessions where auth_uid = v_uid;
  insert into public.student_sessions (auth_uid, student_id, access_code_id) values (v_uid, v_student.id, v_code_id);
  -- keep at most 5 logged-in devices per student (oldest are logged out)
  delete from public.student_sessions where auth_uid in (
    select auth_uid from public.student_sessions where student_id = v_student.id
    order by created_at desc offset 5);
  update public.access_codes set last_used_at = now() where id = v_code_id;

  return json_build_object('ok', true, 'name', v_student.name);
end $$;

create or replace function public.student_logout() returns boolean
language sql volatile security definer set search_path = public, pg_temp as $$
  delete from public.student_sessions where auth_uid = auth.uid();
  select true;
$$;

create or replace function public.student_dashboard() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_sid uuid := public.current_student_id(); r json;
begin
  if v_sid is null then raise exception 'not_logged_in'; end if;
  select json_build_object(
    'student', (select json_build_object('id', s.id, 'name', s.name, 'email', s.email, 'mobile', s.mobile, 'joined_at', s.joined_at)
                  from public.students s where s.id = v_sid),
    'courses', (select coalesce(json_agg(x order by x.enrolled_at desc), '[]'::json) from (
                  select c.id, c.slug, c.title, c.course_type, c.thumbnail_url, c.duration, c.schedule_days,
                         c.class_time, c.platform, e.expires_at, e.created_at as enrolled_at,
                         (select count(*) from public.lessons l where l.course_id = c.id) as total_lessons,
                         (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
                           where lp.student_id = v_sid and l.course_id = c.id) as done_lessons
                  from public.enrollments e join public.courses c on c.id = e.course_id
                  where e.student_id = v_sid and e.status = 'active' and (e.expires_at is null or e.expires_at > now())) x),
    'ebooks', (select coalesce(json_agg(x order by x.purchased_at desc), '[]'::json) from (
                  select b.id, b.slug, b.title, b.cover_url, b.author, b.pages, p.expires_at, p.created_at as purchased_at,
                         exists (select 1 from public.ebook_files f where f.ebook_id = b.id) as has_file
                  from public.ebook_purchases p join public.ebooks b on b.id = p.ebook_id
                  where p.student_id = v_sid and p.status = 'active' and (p.expires_at is null or p.expires_at > now())) x),
    'live_classes', (select coalesce(json_agg(x order by x.class_date nulls last, x.start_time), '[]'::json) from (
                  select lc.id, lc.title, lc.class_date, lc.start_time, lc.platform, lc.meeting_link, lc.meeting_id,
                         lc.passcode, lc.notes, c.title as course_title
                  from public.live_classes lc join public.courses c on c.id = lc.course_id
                  where public.has_course(lc.course_id)
                    and (lc.class_date is null or lc.class_date >= current_date - 1)) x),
    'payments', (select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
                  select product_title, amount, method, status, created_at from public.payments
                  where student_id = v_sid or lower(email) = (select lower(email) from public.students where id = v_sid)
                  order by created_at desc limit 20) x)
  ) into r;
  return r;
end $$;

-- Everything the course player needs. Raises 'not_enrolled' if no access.
create or replace function public.student_course(p_slug text) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_sid uuid := public.current_student_id(); v_course public.courses%rowtype; v_enrolled timestamptz;
begin
  if v_sid is null then raise exception 'not_logged_in'; end if;
  select * into v_course from public.courses where slug = p_slug;
  if not found or not public.has_course(v_course.id) then raise exception 'not_enrolled'; end if;
  select created_at into v_enrolled from public.enrollments where student_id = v_sid and course_id = v_course.id;

  return json_build_object(
    'course', json_build_object('id', v_course.id, 'slug', v_course.slug, 'title', v_course.title,
               'course_type', v_course.course_type, 'instructor', v_course.instructor, 'duration', v_course.duration),
    'modules', (select coalesce(json_agg(m order by m.sort_order, m.title), '[]'::json) from (
        select cm.id, cm.title, cm.description, cm.sort_order,
          (select coalesce(json_agg(json_build_object(
              'id', l.id, 'title', l.title, 'description', l.description, 'duration', l.duration,
              'locked', (l.drip_days > 0 and now() < v_enrolled + make_interval(days => l.drip_days)),
              'unlocks_at', case when l.drip_days > 0 then v_enrolled + make_interval(days => l.drip_days) end,
              'video_url', case when l.drip_days > 0 and now() < v_enrolled + make_interval(days => l.drip_days) then null else l.video_url end,
              'has_material', l.material_path is not null, 'material_name', l.material_name)
             order by l.sort_order, l.created_at), '[]'::json)
           from public.lessons l where l.module_id = cm.id) as lessons
        from public.course_modules cm where cm.course_id = v_course.id) m),
    'completed', (select coalesce(json_agg(lp.lesson_id), '[]'::json) from public.lesson_progress lp
                   join public.lessons l on l.id = lp.lesson_id
                   where lp.student_id = v_sid and l.course_id = v_course.id)
  );
end $$;

create or replace function public.mark_lesson(p_lesson_id uuid, p_done boolean default true) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_sid uuid := public.current_student_id(); v_course uuid;
begin
  select course_id into v_course from public.lessons where id = p_lesson_id;
  if v_sid is null or v_course is null or not public.has_course(v_course) then raise exception 'not_enrolled'; end if;
  if p_done then
    insert into public.lesson_progress (student_id, lesson_id) values (v_sid, p_lesson_id) on conflict do nothing;
  else
    delete from public.lesson_progress where student_id = v_sid and lesson_id = p_lesson_id;
  end if;
  return p_done;
end $$;

-- Storage path of a purchased e-book PDF (the file itself is also protected by storage rules)
create or replace function public.get_ebook_file(p_ebook_id uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r public.ebook_files%rowtype;
begin
  if not (public.has_ebook(p_ebook_id) or public.is_admin()) then raise exception 'not_purchased'; end if;
  select * into r from public.ebook_files where ebook_id = p_ebook_id;
  if not found then raise exception 'file_not_uploaded'; end if;
  return json_build_object('path', r.file_path, 'name', r.file_name);
end $$;

create or replace function public.get_lesson_material(p_lesson_id uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare l public.lessons%rowtype; v_enrolled timestamptz;
begin
  select * into l from public.lessons where id = p_lesson_id;
  if not found or l.material_path is null then raise exception 'file_not_uploaded'; end if;
  if public.is_admin() then return json_build_object('path', l.material_path, 'name', l.material_name); end if;
  if not public.has_course(l.course_id) then raise exception 'not_enrolled'; end if;
  select created_at into v_enrolled from public.enrollments where student_id = public.current_student_id() and course_id = l.course_id;
  if l.drip_days > 0 and now() < v_enrolled + make_interval(days => l.drip_days) then raise exception 'locked'; end if;
  return json_build_object('path', l.material_path, 'name', l.material_name);
end $$;

-- ---------------------------------------------------------------------
-- 6. ADMIN FUNCTIONS
-- ---------------------------------------------------------------------

create or replace function public.admin_generate_code(
  p_student_id uuid, p_expires_at timestamptz default null, p_deactivate_old boolean default true,
  p_course_id uuid default null, p_ebook_id uuid default null
) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_code text; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.students where id = p_student_id) then raise exception 'Student not found'; end if;
  if p_deactivate_old then
    update public.access_codes set status = 'inactive' where student_id = p_student_id and status = 'active';
  end if;
  v_code := public._new_access_code();
  insert into public.access_codes (student_id, code_hash, code_hint, course_id, ebook_id, expires_at, created_by)
  values (p_student_id, public._hash_code(v_code), right(v_code, 4), p_course_id, p_ebook_id, p_expires_at, auth.uid())
  returning id into v_id;
  return json_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.admin_approve_payment(p_payment_id uuid, p_access_expires_at timestamptz default null)
returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare p public.payments%rowtype; v_sid uuid; v_code text; v_code_id uuid; v_hint text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status = 'approved' then raise exception 'This payment is already approved'; end if;
  if p.course_id is null and p.ebook_id is null then raise exception 'The product of this payment was deleted'; end if;

  select id into v_sid from public.students where lower(email) = lower(p.email);
  if v_sid is null then
    insert into public.students (name, email, mobile) values (p.name, p.email, p.mobile) returning id into v_sid;
  else
    update public.students set status = 'active', mobile = coalesce(nullif(mobile, ''), p.mobile) where id = v_sid;
  end if;

  if p.product_type = 'course' then
    insert into public.enrollments (student_id, course_id, status, expires_at, payment_id)
    values (v_sid, p.course_id, 'active', p_access_expires_at, p.id)
    on conflict (student_id, course_id) do update
      set status = 'active', expires_at = excluded.expires_at, payment_id = excluded.payment_id;
  else
    insert into public.ebook_purchases (student_id, ebook_id, status, expires_at, payment_id)
    values (v_sid, p.ebook_id, 'active', p_access_expires_at, p.id)
    on conflict (student_id, ebook_id) do update
      set status = 'active', expires_at = excluded.expires_at, payment_id = excluded.payment_id;
  end if;

  update public.payments set status = 'approved', student_id = v_sid, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p.id;

  -- Re-use the student's current code if they already have one; otherwise create one
  select id, code_hint into v_code_id, v_hint from public.access_codes
   where student_id = v_sid and status = 'active' and (expires_at is null or expires_at > now())
   order by created_at desc limit 1;
  if v_code_id is null then
    v_code := public._new_access_code();
    v_hint := right(v_code, 4);
    insert into public.access_codes (student_id, code_hash, code_hint, course_id, ebook_id, created_by)
    values (v_sid, public._hash_code(v_code), v_hint, p.course_id, p.ebook_id, auth.uid());
  end if;

  return json_build_object('student_id', v_sid, 'name', p.name, 'email', p.email, 'mobile', p.mobile,
                           'product_title', p.product_title, 'code', v_code, 'code_hint', v_hint,
                           'new_code', v_code is not null);
end $$;

create or replace function public.admin_reject_payment(p_payment_id uuid, p_note text default null) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.payments set status = 'rejected', admin_note = coalesce(p_note, admin_note),
         reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_payment_id and status = 'pending';
  if not found then raise exception 'Only pending payments can be rejected'; end if;
  return true;
end $$;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return json_build_object(
    'students',          (select count(*) from public.students),
    'active_students',   (select count(*) from public.students where status = 'active'),
    'active_courses',    (select count(*) from public.courses where status = 'published'),
    'live_courses',      (select count(*) from public.courses where status = 'published' and course_type = 'live'),
    'recorded_courses',  (select count(*) from public.courses where status = 'published' and course_type = 'recorded'),
    'ebooks',            (select count(*) from public.ebooks where status = 'published'),
    'pending_payments',  (select count(*) from public.payments where status = 'pending'),
    'approved_payments', (select count(*) from public.payments where status = 'approved'),
    'total_sales',       (select coalesce(sum(amount), 0) from public.payments where status = 'approved'),
    'month_sales',       (select coalesce(sum(amount), 0) from public.payments
                           where status = 'approved' and reviewed_at >= date_trunc('month', now())),
    'unread_messages',   (select count(*) from public.contact_messages where not is_read)
  );
end $$;

-- Internal helpers must not be callable from the website
revoke execute on function public._new_access_code() from public, anon, authenticated;
revoke execute on function public._hash_code(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. FILE STORAGE
--   public-media : images, covers, blog images, free sample PDFs (public)
--   ebook-files  : paid e-book PDFs          → "<ebook id>/<file>.pdf"   (private)
--   course-files : lesson download materials → "<course id>/<file>"      (private)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 5242880,
     array['image/png','image/jpeg','image/webp','image/gif','application/pdf']),
  ('ebook-files',  'ebook-files',  false, 52428800, array['application/pdf']),
  ('course-files', 'course-files', false, 52428800, null)
on conflict (id) do nothing;

drop policy if exists "aca media read"        on storage.objects;
drop policy if exists "aca admin upload"      on storage.objects;
drop policy if exists "aca admin update"      on storage.objects;
drop policy if exists "aca admin delete"      on storage.objects;
drop policy if exists "aca ebook download"    on storage.objects;
drop policy if exists "aca material download" on storage.objects;

create policy "aca media read" on storage.objects for select
  using (bucket_id = 'public-media');

create policy "aca admin upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('public-media','ebook-files','course-files') and public.is_admin());

create policy "aca admin update" on storage.objects for update to authenticated
  using (bucket_id in ('public-media','ebook-files','course-files') and public.is_admin())
  with check (bucket_id in ('public-media','ebook-files','course-files') and public.is_admin());

create policy "aca admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('public-media','ebook-files','course-files') and public.is_admin());

create policy "aca ebook download" on storage.objects for select to authenticated
  using (bucket_id = 'ebook-files' and (public.is_admin() or public.has_ebook(public._folder_uuid(name))));

create policy "aca material download" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and (public.is_admin() or public.has_course(public._folder_uuid(name))));

-- Done ✔
