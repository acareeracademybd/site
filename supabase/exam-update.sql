-- =====================================================================
--  ONLINE EXAM SYSTEM — run ONCE
--  Supabase Dashboard → SQL Editor → New query → paste all → Run
--  Then run supabase/exam-questions.sql (the 200-question bank).
--  Safe to run again later: it will not delete exams, questions or results.
--
--  How it works
--   • Only registered students (Students list, status Active, with an
--     active course enrollment) can take an exam.
--   • Student enters email → a 6-digit code is emailed (valid 10 min).
--   • Code → exam starts: random questions (Easy / Practical / Hard mix),
--     random order, shuffled options. Correct answers never leave the
--     database. The timer is kept by the database, not the browser.
--   • Submit (or time over) → marked by the database → result emailed.
--   • Max attempts per email per exam per day (Bangladesh time) — default 2.
--
--  Email is sent through Resend (resend.com) using Supabase's pg_net.
--  The Resend API key is stored in Supabase Vault (see README → Exam setup).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net could not be enabled here (%). Enable it in Database → Extensions.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

-- Topics = the 8 classes of the course (questions are grouped by topic)
create table if not exists public.exam_topics (
  id         smallint primary key,
  title      text not null,
  sort_order int not null default 0
);

create table if not exists public.exam_questions (
  id          uuid primary key default gen_random_uuid(),
  topic_id    smallint not null references public.exam_topics(id) on update cascade,
  difficulty  text not null default 'easy' check (difficulty in ('easy','practical','hard')),
  question    text not null check (char_length(question) between 3 and 2000),
  option_a    text not null check (char_length(option_a) between 1 and 500),
  option_b    text not null check (char_length(option_b) between 1 and 500),
  option_c    text not null check (char_length(option_c) between 1 and 500),
  option_d    text not null check (char_length(option_d) between 1 and 500),
  correct     text not null check (correct in ('a','b','c','d')),
  explanation text,
  ref_no      int,                       -- number in the original question bank
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists exam_questions_pool_idx on public.exam_questions(topic_id, difficulty) where status = 'active';
create unique index if not exists exam_questions_ref_key on public.exam_questions(ref_no) where ref_no is not null;

create table if not exists public.exams (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                text not null,
  description          text,
  topic_ids            smallint[] not null default '{}',   -- which topics the questions come from
  course_ids           uuid[] not null default '{}',       -- who may sit it; empty = any enrolled student
  easy_count           int not null default 8  check (easy_count between 0 and 200),
  practical_count      int not null default 8  check (practical_count between 0 and 200),
  hard_count           int not null default 4  check (hard_count between 0 and 200),
  total_marks          numeric(6,2) not null default 100 check (total_marks > 0),
  pass_marks           numeric(6,2) not null default 75  check (pass_marks >= 0),
  duration_minutes     int not null default 40 check (duration_minutes between 1 and 600),
  max_attempts_per_day int not null default 2  check (max_attempts_per_day between 1 and 50),
  status               text not null default 'open' check (status in ('open','closed')),
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (easy_count + practical_count + hard_count between 1 and 200),
  check (pass_marks <= total_marks)
);

-- Emailed one-time codes (only a fingerprint is stored)
create table if not exists public.exam_codes (
  id         bigserial primary key,
  exam_id    uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  email      text not null,
  code_hash  text not null,
  tries      int not null default 0,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists exam_codes_lookup_idx on public.exam_codes(email, exam_id, created_at desc);

create table if not exists public.exam_attempts (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid references public.exams(id) on delete set null,
  student_id       uuid references public.students(id) on delete set null,
  name             text not null,
  email            text not null,
  exam_title       text not null,
  token_hash       text not null unique,
  exam_day         date not null,                 -- Bangladesh date (daily limit)
  started_at       timestamptz not null default now(),
  deadline         timestamptz not null,
  submitted_at     timestamptz,
  status           text not null default 'in_progress' check (status in ('in_progress','submitted','timeout')),
  question_count   int not null,
  total_marks      numeric(6,2) not null,
  pass_marks       numeric(6,2) not null,
  correct_count    int,
  score            numeric(6,2),
  passed           boolean,
  breakdown        jsonb,                         -- per-topic correct / total
  tab_switches     int not null default 0,
  counts_for_limit boolean not null default true, -- admin can give an extra attempt
  result_email_at  timestamptz
);
create index if not exists exam_attempts_limit_idx on public.exam_attempts(student_id, exam_id, exam_day);
create index if not exists exam_attempts_list_idx on public.exam_attempts(started_at desc);

create table if not exists public.exam_attempt_items (
  attempt_id   uuid not null references public.exam_attempts(id) on delete cascade,
  position     smallint not null,
  question_id  uuid references public.exam_questions(id) on delete set null,
  option_order text not null,      -- e.g. 'cadb' = shown option 1 is original option c, …
  correct      text not null,      -- original letter, copied at start (editing a question later doesn't change old results)
  chosen       text check (chosen in ('a','b','c','d')),
  answered_at  timestamptz,
  primary key (attempt_id, position)
);

-- Which emails were sent (to show delivery status in the Admin Panel)
create table if not exists public.exam_email_log (
  id         bigserial primary key,
  request_id bigint,
  kind       text not null,         -- code / result / test
  to_email   text not null,
  attempt_id uuid,
  error      text,
  created_at timestamptz not null default now()
);
create index if not exists exam_email_log_created_idx on public.exam_email_log(created_at desc);

do $$
declare t text;
begin
  foreach t in array array['exam_topics','exam_questions','exams'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
  end loop;
  foreach t in array array['exam_questions','exams'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public._touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. SECURITY: only admins can read/change these tables directly.
--    Students use the functions below, never the tables.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['exam_topics','exam_questions','exams','exam_codes','exam_attempts',
                           'exam_attempt_items','exam_email_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format('create policy "admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. INTERNAL HELPERS (not callable from the website)
-- ---------------------------------------------------------------------

create or replace function public._exam_today() returns date
language sql stable set search_path = public, pg_temp as $$
  select (now() at time zone 'Asia/Dhaka')::date;
$$;

create or replace function public._exam_setting(p_key text, p_default text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(nullif(trim((select value from public.website_settings where key = p_key)), ''), p_default);
$$;

-- Is this student allowed to sit this exam?
create or replace function public._exam_eligible(p_student_id uuid, p_course_ids uuid[]) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and (cardinality(p_course_ids) = 0 or e.course_id = any(p_course_ids)));
$$;

create or replace function public._exam_used_today(p_student_id uuid, p_exam_id uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from public.exam_attempts
  where student_id = p_student_id and exam_id = p_exam_id
    and exam_day = public._exam_today() and counts_for_limit;
$$;

create or replace function public._exam_html_escape(p text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- Send an email through Resend. Returns the pg_net request id (or NULL when not configured).
create or replace function public._exam_send_email(p_to text, p_subject text, p_html text, p_kind text, p_attempt_id uuid default null)
returns bigint
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_key  text;
  v_req  bigint;
  v_bcc  text := case when p_kind = 'result' then public._exam_setting('exam_result_copy_to', '') else '' end;
  v_body jsonb;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then v_key := null;
  end;
  if v_key is null or v_key = '' then
    insert into public.exam_email_log (kind, to_email, attempt_id, error) values (p_kind, p_to, p_attempt_id, 'Resend API key is not set (Vault: resend_api_key)');
    return null;
  end if;

  v_body := jsonb_build_object(
    'from', public._exam_setting('exam_email_from', 'Accounting Career Academy <exam@accountingcareeracademy.com>'),
    'to', jsonb_build_array(p_to),
    'subject', p_subject,
    'html', p_html);
  if v_bcc ~ '@' then v_body := v_body || jsonb_build_object('bcc', jsonb_build_array(v_bcc)); end if;
  if public._exam_setting('exam_reply_to', '') ~ '@' then
    v_body := v_body || jsonb_build_object('reply_to', public._exam_setting('exam_reply_to', ''));
  end if;

  begin
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      body    := v_body,
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      timeout_milliseconds := 10000) into v_req;
  exception when others then
    insert into public.exam_email_log (kind, to_email, attempt_id, error) values (p_kind, p_to, p_attempt_id, 'pg_net error: ' || sqlerrm);
    return null;
  end;
  insert into public.exam_email_log (request_id, kind, to_email, attempt_id) values (v_req, p_kind, p_to, p_attempt_id);
  delete from public.exam_email_log where created_at < now() - interval '90 days';
  return v_req;
end $$;

-- Common HTML wrapper for emails
create or replace function public._exam_email_html(p_inner text) returns text
language sql stable set search_path = public, pg_temp as $$
  select '<div style="font-family:Arial,Helvetica,sans-serif;background:#F3FAFD;padding:24px 12px">'
      || '<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #DCE8EF;border-radius:10px;overflow:hidden">'
      || '<div style="background:#12355B;color:#fff;padding:14px 20px;font-weight:bold;letter-spacing:.5px">ACCOUNTING CAREER ACADEMY</div>'
      || '<div style="padding:22px 20px;color:#22364A;font-size:15px;line-height:1.6">' || p_inner || '</div>'
      || '<div style="padding:12px 20px;background:#F6FAFC;color:#52657A;font-size:12px">এটি একটি স্বয়ংক্রিয় ইমেইল। প্রশ্ন থাকলে WhatsApp-এ যোগাযোগ করুন।</div>'
      || '</div></div>';
$$;

-- Build the question list for the browser (NO correct answers inside)
create or replace function public._exam_payload(p_attempt_id uuid) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'ok', true,
    'state', 'running',
    'attempt_id', a.id,
    'name', a.name,
    'email', a.email,
    'exam_title', a.exam_title,
    'question_count', a.question_count,
    'total_marks', a.total_marks,
    'pass_marks', a.pass_marks,
    'deadline', a.deadline,
    'server_now', now(),
    'questions', (
      select json_agg(json_build_object(
        'pos', i.position,
        'text', q.question,
        'options', json_build_array(
          case substr(i.option_order,1,1) when 'a' then q.option_a when 'b' then q.option_b when 'c' then q.option_c else q.option_d end,
          case substr(i.option_order,2,1) when 'a' then q.option_a when 'b' then q.option_b when 'c' then q.option_c else q.option_d end,
          case substr(i.option_order,3,1) when 'a' then q.option_a when 'b' then q.option_b when 'c' then q.option_c else q.option_d end,
          case substr(i.option_order,4,1) when 'a' then q.option_a when 'b' then q.option_b when 'c' then q.option_c else q.option_d end),
        'chosen', case when i.chosen is null then null else strpos(i.option_order, i.chosen) - 1 end
      ) order by i.position)
      from public.exam_attempt_items i
      join public.exam_questions q on q.id = i.question_id
      where i.attempt_id = a.id))
  from public.exam_attempts a where a.id = p_attempt_id;
$$;

create or replace function public._exam_result_json(p_attempt_id uuid) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'ok', true,
    'state', 'finished',
    'name', a.name,
    'email', a.email,
    'exam_title', a.exam_title,
    'status', a.status,
    'question_count', a.question_count,
    'correct_count', a.correct_count,
    'answered_count', (select count(*) from public.exam_attempt_items i where i.attempt_id = a.id and i.chosen is not null),
    'score', a.score,
    'total_marks', a.total_marks,
    'pass_marks', a.pass_marks,
    'passed', a.passed,
    'breakdown', a.breakdown,
    'submitted_at', a.submitted_at,
    'attempts_left_today', case when a.exam_id is null or a.student_id is null then 0 else
       greatest(0, coalesce((select max_attempts_per_day from public.exams where id = a.exam_id), 0)
                   - public._exam_used_today(a.student_id, a.exam_id)) end)
  from public.exam_attempts a where a.id = p_attempt_id;
$$;

-- Mark an attempt, store the result and email it (only once)
create or replace function public._exam_finalize(p_attempt_id uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  a public.exam_attempts%rowtype;
  v_correct int;
  v_score numeric;
  v_passed boolean;
  v_breakdown jsonb;
  v_rows text;
  v_left int;
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or a.status <> 'in_progress' then return; end if;

  select count(*) filter (where chosen = correct) into v_correct
  from public.exam_attempt_items where attempt_id = a.id;
  v_score  := round(v_correct * a.total_marks / greatest(a.question_count, 1), 2);
  v_passed := v_score >= a.pass_marks;

  select coalesce(jsonb_agg(jsonb_build_object('topic', t.title, 'correct', x.c, 'total', x.n) order by t.sort_order, t.id), '[]'::jsonb)
    into v_breakdown
  from (
    select q.topic_id, count(*) n, count(*) filter (where i.chosen = i.correct) c
    from public.exam_attempt_items i join public.exam_questions q on q.id = i.question_id
    where i.attempt_id = a.id group by q.topic_id
  ) x join public.exam_topics t on t.id = x.topic_id;

  update public.exam_attempts set
    status = p_status,
    submitted_at = least(now(), a.deadline + interval '15 seconds'),
    correct_count = v_correct, score = v_score, passed = v_passed, breakdown = v_breakdown
  where id = a.id;

  -- Result email
  select string_agg(format('<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">%s</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">%s / %s</td></tr>',
           public._exam_html_escape(b->>'topic'), b->>'correct', b->>'total'), '')
    into v_rows from jsonb_array_elements(v_breakdown) b;
  v_left := case when a.exam_id is null or a.student_id is null then 0 else
    greatest(0, coalesce((select max_attempts_per_day from public.exams where id = a.exam_id), 0) - public._exam_used_today(a.student_id, a.exam_id)) end;

  perform public._exam_send_email(
    a.email,
    format('পরীক্ষার ফলাফল: %s/%s — %s', trim(to_char(v_score, 'FM9990.##')), trim(to_char(a.total_marks, 'FM9990.##')), case when v_passed then 'পাশ ✅' else 'ফেল' end),
    public._exam_email_html(
      format('<p>প্রিয় %s,</p><p><b>%s</b> পরীক্ষার ফলাফল:</p>', public._exam_html_escape(a.name), public._exam_html_escape(a.exam_title))
      || format('<div style="text-align:center;margin:18px 0;padding:16px;border-radius:10px;background:%s">'
                || '<div style="font-size:34px;font-weight:bold;color:#12355B">%s <span style="font-size:18px;color:#52657A">/ %s</span></div>'
                || '<div style="font-size:18px;font-weight:bold;color:%s">%s</div>'
                || '<div style="font-size:13px;color:#52657A">সঠিক উত্তর %s / %s · পাশ নম্বর %s</div></div>',
           case when v_passed then '#E7F5EE' else '#FDECEA' end,
           trim(to_char(v_score, 'FM9990.##')), trim(to_char(a.total_marks, 'FM9990.##')),
           case when v_passed then '#1E7A4F' else '#B42318' end,
           case when v_passed then 'অভিনন্দন! আপনি পাশ করেছেন' else 'এবার পাশ হয়নি' end,
           v_correct, a.question_count, trim(to_char(a.pass_marks, 'FM9990.##')))
      || case when v_rows is not null then '<p style="margin-bottom:6px"><b>টপিক অনুযায়ী</b></p><table style="width:100%;border-collapse:collapse;font-size:14px">' || v_rows || '</table>' else '' end
      || format('<p style="font-size:13px;color:#52657A">পরীক্ষার্থী: %s<br>শুরু: %s<br>অবস্থা: %s%s</p>',
           public._exam_html_escape(a.email),
           to_char(a.started_at at time zone 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM'),
           case when p_status = 'timeout' then 'সময় শেষে স্বয়ংক্রিয়ভাবে জমা' else 'জমা দেওয়া হয়েছে' end,
           case when not v_passed and v_left > 0 then format('<br>আজ আরও %s বার চেষ্টা করতে পারবেন।', v_left) else '' end)),
    'result', a.id);
  update public.exam_attempts set result_email_at = now() where id = a.id;
end $$;

-- Close attempts whose time ran out (browser closed etc.). Runs every 5 minutes (pg_cron) and on demand.
create or replace function public._exam_close_expired() returns int
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r record; n int := 0;
begin
  for r in select id from public.exam_attempts where status = 'in_progress' and deadline < now() - interval '1 minute' loop
    perform public._exam_finalize(r.id, 'timeout');
    n := n + 1;
  end loop;
  delete from public.exam_codes where created_at < now() - interval '3 days';
  return n;
end $$;

-- Find the running attempt of a browser token
create or replace function public._exam_by_token(p_token text) returns public.exam_attempts
language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.exam_attempts where token_hash = public._hash_code(coalesce(p_token, '')) limit 1;
$$;

-- ---------------------------------------------------------------------
-- 4. PUBLIC FUNCTIONS (used by the exam page)
-- ---------------------------------------------------------------------

-- Open exams for the exam page
create or replace function public.exam_list() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(json_agg(json_build_object(
    'id', e.id, 'slug', e.slug, 'title', e.title, 'description', e.description,
    'question_count', e.easy_count + e.practical_count + e.hard_count,
    'total_marks', e.total_marks, 'pass_marks', e.pass_marks,
    'duration_minutes', e.duration_minutes, 'max_attempts_per_day', e.max_attempts_per_day,
    'topics', (select json_agg(t.title order by t.sort_order, t.id) from public.exam_topics t where t.id = any(e.topic_ids)),
    'courses', (select json_agg(c.title order by c.sort_order) from public.courses c where c.id = any(e.course_ids))
  ) order by e.sort_order, e.created_at), '[]'::json)
  from public.exams e where e.status = 'open';
$$;

-- Step 1: email a 6-digit code
create or replace function public.exam_request_code(p_exam_id uuid, p_email text) returns json
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_exam public.exams%rowtype;
  v_student public.students%rowtype;
  v_used int;
  v_code text;
  v_req bigint;
begin
  select * into v_exam from public.exams where id = p_exam_id and status = 'open';
  if not found then return json_build_object('ok', false, 'error', 'exam_closed'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'error', 'bad_email'); end if;

  select * into v_student from public.students where lower(email) = v_email;
  if not found then return json_build_object('ok', false, 'error', 'not_student'); end if;
  if v_student.status <> 'active' then return json_build_object('ok', false, 'error', 'inactive'); end if;
  if not public._exam_eligible(v_student.id, v_exam.course_ids) then return json_build_object('ok', false, 'error', 'not_eligible'); end if;

  v_used := public._exam_used_today(v_student.id, v_exam.id);
  if v_used >= v_exam.max_attempts_per_day
     and not exists (select 1 from public.exam_attempts where student_id = v_student.id and exam_id = v_exam.id
                     and status = 'in_progress' and deadline > now()) then
    return json_build_object('ok', false, 'error', 'limit', 'max', v_exam.max_attempts_per_day);
  end if;

  -- Anti-spam: 1 code per minute, 8 per day per email, 300 per hour overall
  if exists (select 1 from public.exam_codes where email = v_email and created_at > now() - interval '60 seconds') then
    return json_build_object('ok', false, 'error', 'wait');
  end if;
  if (select count(*) from public.exam_codes where email = v_email and created_at > now() - interval '1 day') >= 8
     or (select count(*) from public.exam_codes where created_at > now() - interval '1 hour') >= 300 then
    return json_build_object('ok', false, 'error', 'too_many_codes');
  end if;

  v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  update public.exam_codes set used_at = now() where email = v_email and exam_id = v_exam.id and used_at is null;
  insert into public.exam_codes (exam_id, student_id, email, code_hash, expires_at)
  values (v_exam.id, v_student.id, v_email, public._hash_code(v_code || ':' || v_email), now() + interval '10 minutes');

  v_req := public._exam_send_email(
    v_email,
    'পরীক্ষার কোড: ' || v_code || ' — Accounting Career Academy',
    public._exam_email_html(format(
      '<p>প্রিয় %s,</p><p><b>%s</b> পরীক্ষা শুরু করার কোড:</p>'
      || '<div style="text-align:center;margin:18px 0"><span style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:bold;color:#12355B;background:#E4F3F9;padding:12px 22px;border-radius:10px">%s</span></div>'
      || '<p>কোডটি <b>১০ মিনিট</b> কার্যকর থাকবে। পরীক্ষা: %s টি প্রশ্ন, %s মিনিট, পাশ নম্বর %s / %s।</p>'
      || '<p style="font-size:13px;color:#B42318">এই কোড কাউকে দেবেন না। আপনি কোড চাননি হলে এই ইমেইলটি উপেক্ষা করুন।</p>',
      public._exam_html_escape(v_student.name), public._exam_html_escape(v_exam.title), v_code,
      v_exam.easy_count + v_exam.practical_count + v_exam.hard_count, v_exam.duration_minutes,
      trim(to_char(v_exam.pass_marks, 'FM9990.##')), trim(to_char(v_exam.total_marks, 'FM9990.##')))),
    'code');
  if v_req is null then
    delete from public.exam_codes where email = v_email and exam_id = v_exam.id and used_at is null;
    return json_build_object('ok', false, 'error', 'email_not_configured');
  end if;

  return json_build_object('ok', true, 'name', v_student.name,
    'attempts_left', greatest(0, v_exam.max_attempts_per_day - v_used));
end $$;

-- Step 2: check the code and start (or continue) the exam
create or replace function public.exam_start(p_exam_id uuid, p_email text, p_code text) returns json
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code  text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_exam public.exams%rowtype;
  v_student public.students%rowtype;
  c public.exam_codes%rowtype;
  v_attempt uuid;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_n int;
  v_ids uuid[];
begin
  select * into v_exam from public.exams where id = p_exam_id and status = 'open';
  if not found then return json_build_object('ok', false, 'error', 'exam_closed'); end if;

  select * into c from public.exam_codes
   where email = v_email and exam_id = p_exam_id and used_at is null
   order by created_at desc limit 1 for update;
  if not found then return json_build_object('ok', false, 'error', 'no_code'); end if;
  if c.expires_at < now() then return json_build_object('ok', false, 'error', 'expired'); end if;
  if c.tries >= 5 then return json_build_object('ok', false, 'error', 'too_many_tries'); end if;
  if c.code_hash <> public._hash_code(v_code || ':' || v_email) then
    update public.exam_codes set tries = tries + 1 where id = c.id;
    return json_build_object('ok', false, 'error', 'invalid_code', 'tries_left', 4 - c.tries);
  end if;
  update public.exam_codes set used_at = now() where id = c.id;

  select * into v_student from public.students where id = c.student_id;
  if not found or v_student.status <> 'active' then return json_build_object('ok', false, 'error', 'inactive'); end if;
  if not public._exam_eligible(v_student.id, v_exam.course_ids) then return json_build_object('ok', false, 'error', 'not_eligible'); end if;

  -- Close this student's expired attempts first
  for v_attempt in select id from public.exam_attempts
     where student_id = v_student.id and status = 'in_progress' and deadline <= now() loop
    perform public._exam_finalize(v_attempt, 'timeout');
  end loop;

  -- Still running on another device/tab? Continue it (it does not count again).
  select id into v_attempt from public.exam_attempts
   where student_id = v_student.id and exam_id = v_exam.id and status = 'in_progress' and deadline > now()
   order by started_at desc limit 1;
  if v_attempt is not null then
    update public.exam_attempts set token_hash = public._hash_code(v_token) where id = v_attempt;
    return (public._exam_payload(v_attempt)::jsonb || jsonb_build_object('token', v_token, 'resumed', true))::json;
  end if;

  if public._exam_used_today(v_student.id, v_exam.id) >= v_exam.max_attempts_per_day then
    return json_build_object('ok', false, 'error', 'limit', 'max', v_exam.max_attempts_per_day);
  end if;

  -- Pick questions: the set number from each level, at random
  v_n := v_exam.easy_count + v_exam.practical_count + v_exam.hard_count;
  select array_agg(id) into v_ids from (
    select id, difficulty, row_number() over (partition by difficulty order by random()) rn
    from public.exam_questions
    where status = 'active' and topic_id = any(v_exam.topic_ids)
  ) p
  where (difficulty = 'easy' and rn <= v_exam.easy_count)
     or (difficulty = 'practical' and rn <= v_exam.practical_count)
     or (difficulty = 'hard' and rn <= v_exam.hard_count);
  v_ids := coalesce(v_ids, '{}');
  -- Not enough in one level? Fill from the other levels of the same topics.
  if cardinality(v_ids) < v_n then
    v_ids := v_ids || array(select id from public.exam_questions
                            where status = 'active' and topic_id = any(v_exam.topic_ids) and id <> all(v_ids)
                            order by random() limit v_n - cardinality(v_ids));
  end if;
  if cardinality(v_ids) < v_n then
    return json_build_object('ok', false, 'error', 'not_ready');
  end if;

  insert into public.exam_attempts (exam_id, student_id, name, email, exam_title, token_hash, exam_day, deadline,
                                    question_count, total_marks, pass_marks)
  values (v_exam.id, v_student.id, v_student.name, v_email, v_exam.title, public._hash_code(v_token), public._exam_today(),
          now() + make_interval(mins => v_exam.duration_minutes), v_n, v_exam.total_marks, v_exam.pass_marks)
  returning id into v_attempt;

  insert into public.exam_attempt_items (attempt_id, position, question_id, option_order, correct)
  select v_attempt, row_number() over (order by random()), q.id,
         (select string_agg(l, '' order by random()) from unnest(array['a','b','c','d']) l where q.id is not null),
         q.correct
  from public.exam_questions q where q.id = any(v_ids);

  return (public._exam_payload(v_attempt)::jsonb || jsonb_build_object('token', v_token, 'resumed', false))::json;
end $$;

-- Reload the page: get the running exam again (or its result)
create or replace function public.exam_state(p_token text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare a public.exam_attempts%rowtype := public._exam_by_token(p_token);
begin
  if a.id is null then return json_build_object('ok', false, 'error', 'no_attempt'); end if;
  if a.status = 'in_progress' and a.deadline + interval '15 seconds' < now() then
    perform public._exam_finalize(a.id, 'timeout');
    a.status := 'timeout';
  end if;
  if a.status <> 'in_progress' then return public._exam_result_json(a.id); end if;
  return public._exam_payload(a.id);
end $$;

-- Save one answer (p_choice = shown option 0–3, or NULL to clear)
create or replace function public.exam_answer(p_token text, p_position int, p_choice int) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare a public.exam_attempts%rowtype := public._exam_by_token(p_token);
begin
  if a.id is null then return json_build_object('ok', false, 'error', 'no_attempt'); end if;
  if a.status <> 'in_progress' then return json_build_object('ok', false, 'error', 'finished'); end if;
  if a.deadline + interval '15 seconds' < now() then
    perform public._exam_finalize(a.id, 'timeout');
    return json_build_object('ok', false, 'error', 'time_over');
  end if;
  if p_choice is not null and (p_choice < 0 or p_choice > 3) then return json_build_object('ok', false, 'error', 'bad_choice'); end if;
  update public.exam_attempt_items
     set chosen = case when p_choice is null then null else substr(option_order, p_choice + 1, 1) end,
         answered_at = now()
   where attempt_id = a.id and position = p_position;
  if not found then return json_build_object('ok', false, 'error', 'bad_question'); end if;
  return json_build_object('ok', true);
end $$;

-- The page reports leaving the exam tab (shown to the admin)
create or replace function public.exam_flag(p_token text) returns boolean
language sql volatile security definer set search_path = public, pg_temp as $$
  update public.exam_attempts set tab_switches = tab_switches + 1
  where token_hash = public._hash_code(coalesce(p_token, '')) and status = 'in_progress' and tab_switches < 1000
  returning true;
$$;

-- Submit: mark, email the result, return it
create or replace function public.exam_submit(p_token text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare a public.exam_attempts%rowtype := public._exam_by_token(p_token);
begin
  if a.id is null then return json_build_object('ok', false, 'error', 'no_attempt'); end if;
  if a.status = 'in_progress' then
    perform public._exam_finalize(a.id, case when a.deadline + interval '15 seconds' < now() then 'timeout' else 'submitted' end);
  end if;
  return public._exam_result_json(a.id);
end $$;

-- ---------------------------------------------------------------------
-- 5. ADMIN FUNCTIONS
-- ---------------------------------------------------------------------

-- Send a test email (Admin → Exams → Email setup)
create or replace function public.admin_exam_test_email(p_to text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_req bigint;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  v_req := public._exam_send_email(lower(trim(p_to)), 'Test email — Accounting Career Academy Exam',
    public._exam_email_html('<p>✅ ইমেইল সেটআপ সফল। এখন থেকে পরীক্ষার কোড ও ফলাফল এই ঠিকানা থেকে যাবে।</p>'), 'test');
  if v_req is null then
    return json_build_object('ok', false, 'error',
      coalesce((select error from public.exam_email_log order by id desc limit 1), 'Email is not configured'));
  end if;
  return json_build_object('ok', true, 'request_id', v_req);
end $$;

-- Recent emails with delivery status from Resend
create or replace function public.admin_exam_email_log(p_limit int default 50) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r json;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  begin
    select coalesce(json_agg(x order by x.id desc), '[]'::json) into r from (
      select l.id, l.kind, l.to_email, l.created_at, l.error,
             h.status_code, left(coalesce(h.error_msg, h.content::text), 300) as response
      from public.exam_email_log l
      left join net._http_response h on h.id = l.request_id
      order by l.id desc limit least(greatest(p_limit, 1), 200)) x;
  exception when others then
    select coalesce(json_agg(x order by x.id desc), '[]'::json) into r from (
      select l.id, l.kind, l.to_email, l.created_at, l.error, null::int as status_code, null::text as response
      from public.exam_email_log l order by l.id desc limit least(greatest(p_limit, 1), 200)) x;
  end;
  return r;
end $$;

-- One attempt with every question, the correct answer and the student's answer
create or replace function public.admin_exam_attempt(p_attempt_id uuid) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return (select json_build_object(
    'attempt', to_jsonb(a) - 'token_hash',
    'items', (select coalesce(json_agg(json_build_object(
        'pos', i.position, 'question', q.question, 'topic', t.title, 'difficulty', q.difficulty,
        'options', json_build_object('a', q.option_a, 'b', q.option_b, 'c', q.option_c, 'd', q.option_d),
        'correct', i.correct, 'chosen', i.chosen) order by i.position), '[]'::json)
      from public.exam_attempt_items i
      left join public.exam_questions q on q.id = i.question_id
      left join public.exam_topics t on t.id = q.topic_id
      where i.attempt_id = a.id))
    from public.exam_attempts a where a.id = p_attempt_id);
end $$;

-- Close attempts whose time is over (button on the Results page)
create or replace function public.admin_exam_close_expired() returns int
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return public._exam_close_expired();
end $$;

-- Internal helpers must not be callable from the website
revoke execute on function public._exam_send_email(text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public._exam_finalize(uuid, text) from public, anon, authenticated;
revoke execute on function public._exam_close_expired() from public, anon, authenticated;
revoke execute on function public._exam_payload(uuid) from public, anon, authenticated;
revoke execute on function public._exam_result_json(uuid) from public, anon, authenticated;
revoke execute on function public._exam_by_token(text) from public, anon, authenticated;
revoke execute on function public._exam_eligible(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public._exam_used_today(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._exam_setting(text, text) from public, anon, authenticated;
revoke execute on function public._exam_email_html(text) from public, anon, authenticated;
grant execute on function public.exam_list() to anon, authenticated;
grant execute on function public.exam_request_code(uuid, text) to anon, authenticated;
grant execute on function public.exam_start(uuid, text, text) to anon, authenticated;
grant execute on function public.exam_state(text) to anon, authenticated;
grant execute on function public.exam_answer(text, int, int) to anon, authenticated;
grant execute on function public.exam_flag(text) to anon, authenticated;
grant execute on function public.exam_submit(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. AUTO-CLOSE every 5 minutes (needs pg_cron; optional)
-- ---------------------------------------------------------------------
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('aca-exam-close-expired', '*/5 * * * *', 'select public._exam_close_expired()');
exception when others then
  raise notice 'pg_cron not available (%): expired exams will be closed when the student or admin opens them.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 7. STARTING DATA: topics, 4 exams, email settings (only added if missing)
-- ---------------------------------------------------------------------
insert into public.exam_topics (id, title, sort_order) values
  (1, 'ক্লাস ১ — হিসাবের ভিত্তি ও ভাউচার', 1),
  (2, 'ক্লাস ২ — দৈনিক নিয়ন্ত্রণ, ব্যাংক ও ট্যাক্স', 2),
  (3, 'ক্লাস ৩ — সম্পদ, বেতন ও সমন্বয়', 3),
  (4, 'ক্লাস ৪ — Tally Prime: কোম্পানি ও লেজার', 4),
  (5, 'ক্লাস ৫ — Tally Prime: ভাউচার পোস্টিং', 5),
  (6, 'ক্লাস ৬ — Tally Prime: রিপোর্ট ও নিয়ন্ত্রণ', 6),
  (7, 'ক্লাস ৭ — MS Excel: হিসাবরক্ষকের ভিত্তি', 7),
  (8, 'ক্লাস ৮ — MS Excel: হিসাবের রিপোর্ট', 8)
on conflict (id) do nothing;

insert into public.exams (slug, title, description, topic_ids, course_ids, sort_order)
select v.slug, v.title, v.description, v.topic_ids,
       coalesce(array(select id from public.courses where slug = any(v.course_slugs)), '{}'), v.sort_order
from (values
  ('final-exam', 'Final Exam — সব কোর্স মিলিয়ে',
     'Accounting, Tally Prime ও Excel — ক্লাস ১ থেকে ৮-এর সব টপিক থেকে প্রশ্ন।',
     array[1,2,3,4,5,6,7,8]::smallint[], array['practical-accounts-executive-course'], 1),
  ('accounting-exam', 'Practical Accounting Exam',
     'হিসাবের ভিত্তি, ভাউচার, ব্যাংক, VAT/TDS, সম্পদ, বেতন ও সমন্বয় (ক্লাস ১–৩)।',
     array[1,2,3]::smallint[], array['practical-accounts-executive-course'], 2),
  ('tally-prime-exam', 'Tally Prime Exam',
     'কোম্পানি ও লেজার, ভাউচার পোস্টিং, রিপোর্ট ও নিয়ন্ত্রণ (ক্লাস ৪–৬)।',
     array[4,5,6]::smallint[], array['practical-accounts-executive-course','tally-prime-practical-course'], 3),
  ('excel-exam', 'MS Excel for Accounting Exam',
     'Excel-এর ভিত্তি, সূত্র ও হিসাবের রিপোর্ট (ক্লাস ৭–৮)।',
     array[7,8]::smallint[], array['practical-accounts-executive-course','excel-for-accounting'], 4)
) as v(slug, title, description, topic_ids, course_slugs, sort_order)
on conflict (slug) do nothing;

insert into public.website_settings (key, value) values
  ('exam_email_from', 'Accounting Career Academy <exam@accountingcareeracademy.com>'),
  ('exam_reply_to', ''),
  ('exam_result_copy_to', '')
on conflict (key) do nothing;

-- Done ✔  Next: run supabase/exam-questions.sql
