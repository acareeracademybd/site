-- =====================================================================
--  COURSE REGISTRATION UPDATE — run ONCE
--  Supabase Dashboard → SQL Editor → New query → paste all → Run
--  Adds the registration questions (batch, degree, profession, experience,
--  "how did you hear about us", consent) to the payment form.
--  Safe to run again. Your existing payments are not changed.
-- =====================================================================

-- 1. New columns on payments
alter table public.payments add column if not exists batch       text;
alter table public.payments add column if not exists last_degree text;
alter table public.payments add column if not exists profession  text;
alter table public.payments add column if not exists experience  text;
alter table public.payments add column if not exists heard_from  text;
alter table public.payments add column if not exists agreed_at   timestamptz;

-- 2. Replace the payment-form function (old version had 8 inputs)
drop function if exists public.submit_payment(text, text, text, text, uuid, text, text, text);

create or replace function public.submit_payment(
  p_name text, p_email text, p_mobile text, p_product_type text, p_product_id uuid,
  p_method text, p_transaction_id text, p_sender_number text default null,
  p_batch text default null, p_last_degree text default null, p_profession text default null,
  p_experience text default null, p_heard_from text default null, p_agreed boolean default false
) returns json
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_name  text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_mob   text := regexp_replace(coalesce(p_mobile, ''), '[^0-9+]', '', 'g');
  v_trx   text := upper(trim(coalesce(p_transaction_id, '')));
  v_batch text := left(nullif(trim(coalesce(p_batch, '')), ''), 60);
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

  -- Registration questions (courses only). Keep these lists the same as js/registration.js
  if p_product_type = 'course' then
    if coalesce(p_last_degree, '') not in ('HSC','Diploma','Honours / BBA / B.Com','Masters / MBA / M.Com','Other') then
      raise exception 'অনুগ্রহ করে সর্বশেষ ডিগ্রি নির্বাচন করুন।'; end if;
    if coalesce(p_profession, '') not in ('ছাত্র/ছাত্রী','চাকরিজীবী','ব্যবসায়ী','চাকরিপ্রার্থী','Other') then
      raise exception 'অনুগ্রহ করে বর্তমান পেশা নির্বাচন করুন।'; end if;
    if coalesce(p_experience, '') not in ('নেই','১ বছরের কম','১ বছরের বেশি') then
      raise exception 'অনুগ্রহ করে অভিজ্ঞতা নির্বাচন করুন।'; end if;
    if coalesce(p_heard_from, '') not in ('Facebook','YouTube','পরিচিতজন','Other') then
      raise exception 'আমাদের সম্পর্কে কোথায় জেনেছেন — নির্বাচন করুন।'; end if;
    if not coalesce(p_agreed, false) then
      raise exception 'অনুগ্রহ করে সম্মতির ঘরে টিক দিন।'; end if;
  end if;

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
                               amount, method, sender_number, transaction_id,
                               batch, last_degree, profession, experience, heard_from, agreed_at)
  values (v_name, v_email, v_mob, p_product_type,
          case when p_product_type = 'course' then p_product_id end,
          case when p_product_type = 'ebook' then p_product_id end,
          v_title, v_price, p_method, left(nullif(trim(coalesce(p_sender_number, '')), ''), 20), v_trx,
          case when p_product_type = 'course' then v_batch end,
          case when p_product_type = 'course' then p_last_degree end,
          case when p_product_type = 'course' then p_profession end,
          case when p_product_type = 'course' then p_experience end,
          case when p_product_type = 'course' then p_heard_from end,
          case when coalesce(p_agreed, false) then now() end)
  returning id into v_id;

  return json_build_object('id', v_id, 'product_title', v_title, 'amount', v_price, 'transaction_id', v_trx);
end $$;

-- 3. (Optional) Set the batch list for a course — one batch per line.
--    Change the slug and batch names, remove the "--" and run.
-- insert into public.website_settings (key, value)
-- values ('batches_practical-accounts-executive-course', E'Batch – 05\nBatch – 06')
-- on conflict (key) do update set value = excluded.value, updated_at = now();

-- Done ✔
