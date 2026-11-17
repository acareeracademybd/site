-- =====================================================================
--  ACCOUNTING CAREER ACADEMY — CERTIFICATES (add-on)
--  Run once: Supabase → SQL Editor → New query → paste everything → Run.
--  Safe to run again (it never deletes your data).
--
--  What it adds
--   • certificates table (admin only)
--   • public function  certificate_public(code)   → used by /certificate and /verify
--   • admin functions  admin_cert_send / admin_cert_refresh_status
--  Email is sent through Resend (same Resend API key you already saved in
--  Supabase Vault as "resend_api_key" for the exam emails).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------
create table if not exists public.certificates (
  id               uuid primary key default gen_random_uuid(),
  -- secret-looking public id used in links and in the QR code (16 hex characters)
  code             text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  certificate_no   text not null unique,               -- typed by the admin, e.g. 1057
  name             text not null,
  email            text not null,
  batch            text,
  course_name      text not null,
  duration         text,                               -- e.g. 8 sessions of 2:00 hours each.
  course_area      text,                               -- e.g. Practical Accounting, Tally Prime & MS Excel ...
  completion_date  date not null,
  status           text not null default 'valid' check (status in ('valid', 'revoked')),
  email_status     text not null default 'pending' check (email_status in ('pending', 'queued', 'sent', 'failed')),
  email_request_id bigint,
  email_sent_at    timestamptz,
  email_error      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists certificates_created_idx on public.certificates (created_at desc);
create index if not exists certificates_email_idx on public.certificates (lower(email));

create or replace function public._cert_prepare() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.email := lower(trim(new.email));
  new.name := trim(new.name);
  new.certificate_no := trim(new.certificate_no);
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists cert_prepare on public.certificates;
create trigger cert_prepare before insert or update on public.certificates
  for each row execute function public._cert_prepare();

-- Only admins can touch the table directly. The public uses certificate_public() below.
alter table public.certificates enable row level security;
drop policy if exists "admin full access" on public.certificates;
create policy "admin full access" on public.certificates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. INTERNAL HELPERS
-- ---------------------------------------------------------------------
create or replace function public._cert_setting(p_key text, p_default text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(nullif(trim((select value from public.website_settings where key = p_key)), ''), p_default);
$$;

create or replace function public._cert_esc(p text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function public._cert_urlenc(p text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(string_agg(
    case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in (45, 46, 95, 126)
         then chr(b) else '%' || upper(lpad(to_hex(b), 2, '0')) end, '' order by i), '')
  from (select i, get_byte(convert_to(coalesce(p, ''), 'UTF8'), i) as b
        from generate_series(0, length(convert_to(coalesce(p, ''), 'UTF8')) - 1) i) x;
$$;

-- LinkedIn "Add to profile" link (opens LinkedIn's certification form, pre-filled)
create or replace function public._cert_linkedin_url(c public.certificates) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME'
    || '&name=' || public._cert_urlenc(c.course_name)
    || case when public._cert_setting('cert_linkedin_org_id', '') ~ '^[0-9]+$'
            then '&organizationId=' || public._cert_setting('cert_linkedin_org_id', '')
            else '&organizationName=' || public._cert_urlenc(public._cert_setting('cert_linkedin_org_name', 'Accounting Career Academy')) end
    || '&issueYear=' || extract(year from c.completion_date)::int
    || '&issueMonth=' || extract(month from c.completion_date)::int
    || '&certUrl=' || public._cert_urlenc(rtrim(public._cert_setting('cert_site_url', 'https://accountingcareeracademy.com'), '/') || '/verify?id=' || c.code)
    || '&certId=' || public._cert_urlenc(c.certificate_no);
$$;

-- Send one email through Resend. Returns (request_id, error).
create or replace function public._cert_send_email(p_to text, p_subject text, p_html text, out o_req bigint, out o_error text)
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  v_key  text;
  v_body jsonb;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  exception when others then v_key := null;
  end;
  if v_key is null or v_key = '' then
    o_error := 'Resend API key is not set (Supabase Vault name: resend_api_key). See README → Certificates.';
    return;
  end if;

  v_body := jsonb_build_object(
    'from', public._cert_setting('cert_email_from', 'Accounting Career Academy <certificates@accountingcareeracademy.com>'),
    'to', jsonb_build_array(p_to),
    'subject', p_subject,
    'html', p_html);
  if public._cert_setting('cert_reply_to', '') ~ '@' then
    v_body := v_body || jsonb_build_object('reply_to', public._cert_setting('cert_reply_to', ''));
  end if;
  if public._cert_setting('cert_copy_to', '') ~ '@' then
    v_body := v_body || jsonb_build_object('bcc', jsonb_build_array(public._cert_setting('cert_copy_to', '')));
  end if;

  begin
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      body    := v_body,
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      timeout_milliseconds := 10000) into o_req;
  exception when others then
    o_error := 'pg_net error: ' || sqlerrm || ' (is the pg_net extension enabled?)';
  end;
end $$;

create or replace function public._cert_email_html(c public.certificates) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_site text := rtrim(public._cert_setting('cert_site_url', 'https://accountingcareeracademy.com'), '/');
  v_view text := v_site || '/certificate?id=' || c.code;
  v_in   text := public._cert_linkedin_url(c);
  v_btn  text := 'display:inline-block;padding:12px 22px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:15px;';
begin
  return '<div style="font-family:Arial,Helvetica,sans-serif;background:#F3FAFD;padding:24px 12px">'
    || '<div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #DCE8EF;border-radius:10px;overflow:hidden">'
    || '<div style="background:#0A1F3F;color:#fff;padding:14px 20px;font-weight:bold;letter-spacing:.5px">ACCOUNTING CAREER ACADEMY</div>'
    || '<div style="padding:24px 22px;color:#22364A;font-size:15px;line-height:1.65">'
    || '<p style="margin:0 0 12px">Dear ' || public._cert_esc(c.name) || ',</p>'
    || '<p style="margin:0 0 12px">Congratulations! 🎉 You have successfully completed the <b>' || public._cert_esc(c.course_name) || '</b>'
    || case when coalesce(c.batch, '') <> '' then ' (' || public._cert_esc(c.batch) || ')' else '' end
    || ' at Accounting Career Academy. Your certificate is ready.</p>'
    || '<p style="margin:18px 0"><a href="' || v_view || '" style="' || v_btn || 'background:#D39D25;color:#0A1F3F">View &amp; Download Certificate</a></p>'
    || '<p style="margin:0 0 6px">Share your achievement on LinkedIn:</p>'
    || '<p style="margin:0 0 18px"><a href="' || public._cert_esc(v_in) || '" style="' || v_btn || 'background:#0A66C2;color:#ffffff">Add to LinkedIn Profile</a></p>'
    || '<p style="margin:0 0 4px;font-size:13px;color:#52657A">Certificate No.: <b>' || public._cert_esc(c.certificate_no) || '</b></p>'
    || '<p style="margin:0;font-size:13px;color:#52657A">Anyone can verify this certificate by scanning the QR code on it, or at '
    || '<a href="' || v_site || '/verify?id=' || c.code || '" style="color:#0A66C2">' || v_site || '/verify</a>.</p>'
    || '</div>'
    || '<div style="padding:12px 20px;background:#F6FAFC;color:#52657A;font-size:12px">Accounting Career Academy · Professional Learning &amp; Career Development</div>'
    || '</div></div>';
end $$;

-- ---------------------------------------------------------------------
-- 3. PUBLIC FUNCTION (certificate page + QR verification page)
--    Returns ONLY: name, course, batch, number, dates, status. Never the e-mail.
-- ---------------------------------------------------------------------
create or replace function public.certificate_public(p_code text) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select json_build_object(
      'found', true,
      'code', c.code,
      'certificate_no', c.certificate_no,
      'name', c.name,
      'batch', c.batch,
      'course_name', c.course_name,
      'duration', c.duration,
      'course_area', c.course_area,
      'completion_date', c.completion_date,
      'status', c.status,
      'linkedin_url', public._cert_linkedin_url(c),
      'site_url', rtrim(public._cert_setting('cert_site_url', 'https://accountingcareeracademy.com'), '/'))
    from public.certificates c
    where c.code = lower(trim(coalesce(p_code, ''))) and length(trim(p_code)) >= 8
    limit 1), json_build_object('found', false));
$$;

-- ---------------------------------------------------------------------
-- 4. ADMIN FUNCTIONS
-- ---------------------------------------------------------------------

-- Send (or re-send) the certificate e-mail for the given certificates
create or replace function public.admin_cert_send(p_ids uuid[]) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  c   public.certificates;
  r   record;
  n_ok int := 0;
  n_bad int := 0;
  v_err text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  for c in select * from public.certificates where id = any(p_ids) and status = 'valid' order by created_at loop
    select * into r from public._cert_send_email(
      c.email,
      'Your Certificate — ' || c.course_name || ' | Accounting Career Academy',
      public._cert_email_html(c));
    if r.o_req is null then
      update public.certificates set email_status = 'failed', email_error = coalesce(r.o_error, 'Could not queue the email'),
        email_request_id = null where id = c.id;
      n_bad := n_bad + 1; v_err := coalesce(r.o_error, v_err);
    else
      update public.certificates set email_status = 'queued', email_error = null, email_request_id = r.o_req,
        email_sent_at = null where id = c.id;
      n_ok := n_ok + 1;
    end if;
  end loop;
  return json_build_object('queued', n_ok, 'failed', n_bad, 'error', v_err);
end $$;

-- Read delivery results of queued e-mails (Resend answer) and update their status.
-- Called by the admin page every time it opens / refreshes.
create or replace function public.admin_cert_refresh_status() returns int
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare n int := 0;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  begin
    update public.certificates c set
      email_status = case when h.status_code between 200 and 299 then 'sent' else 'failed' end,
      email_sent_at = case when h.status_code between 200 and 299 then now() else null end,
      email_error = case when h.status_code between 200 and 299 then null
        else 'Resend answered ' || coalesce(h.status_code::text, 'no response') || ': ' || left(coalesce(h.error_msg, h.content::text, ''), 300) end
    from net._http_response h
    where h.id = c.email_request_id and c.email_status = 'queued';
    get diagnostics n = row_count;
  exception when others then
    n := 0;
  end;
  -- no answer after a day → treat as failed
  update public.certificates set email_status = 'failed', email_error = 'No answer from Resend. Please send again.'
   where email_status = 'queued' and updated_at < now() - interval '1 day';
  return n;
end $$;

-- Test e-mail (Admin → Certificates → Settings)
create or replace function public.admin_cert_test_email(p_to text) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into r from public._cert_send_email(lower(trim(p_to)), 'Test email — Accounting Career Academy Certificates',
    '<div style="font-family:Arial,sans-serif;font-size:15px">✅ Email setup works. Certificates will be sent from this address.</div>');
  if r.o_req is null then return json_build_object('ok', false, 'error', coalesce(r.o_error, 'Could not send')); end if;
  return json_build_object('ok', true, 'request_id', r.o_req);
end $$;

-- ---------------------------------------------------------------------
-- 5. PERMISSIONS
-- ---------------------------------------------------------------------
revoke execute on function public._cert_setting(text, text) from public, anon, authenticated;
revoke execute on function public._cert_esc(text) from public, anon, authenticated;
revoke execute on function public._cert_urlenc(text) from public, anon, authenticated;
revoke execute on function public._cert_linkedin_url(public.certificates) from public, anon, authenticated;
revoke execute on function public._cert_send_email(text, text, text) from public, anon, authenticated;
revoke execute on function public._cert_email_html(public.certificates) from public, anon, authenticated;
revoke execute on function public.admin_cert_send(uuid[]) from public, anon;
revoke execute on function public.admin_cert_refresh_status() from public, anon;
revoke execute on function public.admin_cert_test_email(text) from public, anon;
grant execute on function public.admin_cert_send(uuid[]) to authenticated;
grant execute on function public.admin_cert_refresh_status() to authenticated;
grant execute on function public.admin_cert_test_email(text) to authenticated;
grant execute on function public.certificate_public(text) to anon, authenticated;

select 'Certificates setup complete ✅' as result;
