-- =====================================================================
--  ACCOUNTING CAREER ACADEMY — demo content (optional)
--  Run AFTER schema.sql. Everything here can be edited or deleted
--  later from the Admin Panel. Items marked [PLACEHOLDER] / (sample)
--  must be replaced with your real information.
-- =====================================================================

insert into public.website_settings (key, value) values
  ('site_name', 'Accounting Career Academy'),
  ('tagline', 'প্র্যাক্টিক্যাল একাউন্টিং শিখুন, ক্যারিয়ার গড়ুন'),
  ('logo_url', ''),
  ('favicon_url', ''),
  ('hero_title', 'প্র্যাক্টিক্যাল একাউন্টিং শিখুন, ক্যারিয়ার গড়ুন'),
  ('hero_subtitle', 'Journal Entry থেকে Financial Statement, Tally Prime থেকে Excel — অফিসের আসল কাজগুলো হাতে-কলমে শিখে একজন দক্ষ Accounts Executive হিসেবে ক্যারিয়ার শুরু করুন।'),
  ('featured_course_slug', 'practical-accounts-executive-course'),
  ('announcement', 'নতুন ব্যাচে ভর্তি চলছে — Practical Accounts Executive Course (LIVE)'),
  ('phone', '+880 1XXX-XXXXXX'),
  ('email', 'info@your-domain.com'),
  ('whatsapp', '8801XXXXXXXXX'),
  ('facebook_url', ''),
  ('messenger_url', ''),
  ('youtube_channel_url', 'https://www.youtube.com/'),
  ('youtube_video_url', ''),
  ('youtube_section_text', 'ভর্তি হওয়ার আগে একটি ফ্রি ক্লাস দেখে নিন — আমরা কীভাবে হাতে-কলমে একাউন্টিং শেখাই।'),
  ('address', 'Dhaka, Bangladesh'),
  ('office_hours', 'শনি – বৃহস্পতি, সকাল ১০টা – রাত ৯টা'),
  ('bkash_number', '01XXXXXXXXX'),
  ('bkash_type', 'Personal'),
  ('nagad_number', '01XXXXXXXXX'),
  ('nagad_type', 'Personal'),
  ('payment_note', 'bKash/Nagad অ্যাপ থেকে উপরের নম্বরে "Send Money" করুন। পেমেন্ট শেষে SMS-এ পাওয়া Transaction ID নিচের ফর্মে লিখুন।'),
  ('footer_text', 'বাংলাদেশে প্র্যাক্টিক্যাল একাউন্টিং, Tally Prime ও Excel শেখার একটি ক্যারিয়ার-কেন্দ্রিক প্রশিক্ষণ প্রতিষ্ঠান।'),
  ('stat_students', '40+'),
  ('stat_courses', '3+'),
  ('stat_ebooks', '3+'),
  ('stat_years', '10+'),
  ('trainer_name', 'Md. Saddam Hossain'),
  ('trainer_title', 'Assistant Manager, Accounts & Finance'),
  ('trainer_photo_url', ''),
  ('trainer_bio', 'কর্পোরেট প্রতিষ্ঠানে ১০ বছরের একাউন্টস ও ফাইন্যান্স অভিজ্ঞতা নিয়ে তিনি শিক্ষার্থীদের সেই কাজগুলোই শেখান যা অফিসে প্রতিদিন করতে হয় — ভাউচার, জার্নাল, লেজার, রিকনসিলিয়েশন, Tally Prime ও Excel রিপোর্টিং।'),
  ('trainer_experience', 'Assistant Manager, Accounts & Finance — a corporate group in Bangladesh
Accounts & finance work across retail, restaurant and fuel-station businesses'),
  ('trainer_education', 'MBA — University of Dhaka
BBA — National University'),
  ('trainer_accounting_exp', '10+ years of practical accounting & finance experience'),
  ('trainer_training_exp', 'Trainer of 40+ students in practical accounting, Tally Prime and Excel [PLACEHOLDER — edit in Admin]'),
  ('trainer_achievements', '[PLACEHOLDER] Add your achievements here, one per line
[PLACEHOLDER] e.g. certifications, awards, notable student placements'),
  ('academy_mission', 'প্রতিটি শিক্ষার্থীকে এমনভাবে প্রস্তুত করা যাতে কোর্স শেষে সে অফিসে প্রথম দিন থেকেই আত্মবিশ্বাসের সাথে একাউন্টসের কাজ করতে পারে।'),
  ('academy_vision', 'বাংলাদেশে প্র্যাক্টিক্যাল একাউন্টিং শিক্ষার সবচেয়ে বিশ্বস্ত ও ক্যারিয়ার-কেন্দ্রিক প্রতিষ্ঠান হয়ে ওঠা।'),
  ('academy_philosophy', 'শুধু থিওরি নয় — বাস্তব কোম্পানির ভাউচার, ব্যাংক স্টেটমেন্ট ও রিপোর্ট দিয়ে শেখা। প্রতিটি টপিক শেষে প্র্যাকটিস, আর প্রতিটি প্রশ্নের উত্তর।'),
  ('academy_achievements', '40+ students trained in practical accounting
Students working as Accounts Executive / Officer [PLACEHOLDER — edit in Admin]
Free demo classes on YouTube')
on conflict do nothing;

insert into public.features (id, title, description, icon, status, sort_order) values
  ('eba47689-3df3-5fad-b2a9-9de887616f5c', 'Practical Accounting Learning', 'বই মুখস্থ নয় — বাস্তব ভাউচার ও লেনদেন দিয়ে হাতে-কলমে একাউন্টিং।', 'book', 'published', 1),
  ('7d29cdc1-4a06-5b39-95df-2079c795fab7', 'Real-world Accounting Skills', 'অফিসে প্রতিদিন যা করতে হয়: Journal, Ledger, Bank Reconciliation, Payroll, VAT।', 'briefcase', 'published', 2),
  ('26d64061-3968-5245-9df4-d55c869ebc81', 'Tally Prime', 'Company create থেকে Voucher entry, Inventory ও Report — সম্পূর্ণ Tally Prime।', 'monitor', 'published', 3),
  ('76f3aa13-ad27-5260-9d08-6e74b7ea6747', 'Excel for Accountants', 'VLOOKUP, SUMIFS, Pivot Table দিয়ে দ্রুত ও নির্ভুল রিপোর্ট তৈরি।', 'grid', 'published', 4),
  ('5dae4544-0f8c-50dc-84ba-f9c7e127b09e', 'Career-focused Training', 'CV, ইন্টারভিউ প্রস্তুতি ও Accounts Executive চাকরির জন্য গাইডলাইন।', 'trend', 'published', 5),
  ('3ff8f985-7abd-5124-85b5-aeea970ad1ad', 'Experienced Trainer', 'কর্পোরেট প্রতিষ্ঠানে ১০ বছরের একাউন্টস ও ফাইন্যান্স অভিজ্ঞ প্রশিক্ষক।', 'user', 'published', 6),
  ('ecd96942-9f6d-5eae-85d1-4bfb2b4f1d2e', 'Student Support', 'কোর্স চলাকালীন ও পরে WhatsApp-এ প্রশ্নের উত্তর ও সাপোর্ট।', 'chat', 'published', 7)
on conflict do nothing;

insert into public.courses (id, slug, title, short_description, full_description, thumbnail_url, price, old_price, duration, course_type, instructor, level, who_should_join, what_you_learn, benefits, schedule_days, class_time, start_date, platform, preview_video_url, is_featured, status, sort_order) values
  ('1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'practical-accounts-executive-course', 'Practical Accounts Executive Course', 'একজন Accounts Executive হিসেবে চাকরির জন্য প্রয়োজনীয় সবকিছু — Accounting, Tally Prime ও Excel — এক কোর্সে, LIVE ক্লাসে।', 'এই কোর্সটি তাদের জন্য যারা একাউন্টস বিভাগে চাকরি শুরু করতে চান বা বর্তমান কাজে আরও দক্ষ হতে চান। Voucher তৈরি থেকে শুরু করে Journal, Ledger, Trial Balance, Bank Reconciliation, Payroll, VAT & Tax-এর মৌলিক ধারণা এবং Financial Statement তৈরি — সবকিছু বাস্তব কোম্পানির উদাহরণ দিয়ে শেখানো হবে।

প্রতিটি LIVE ক্লাসের রেকর্ডিং কোর্স ড্যাশবোর্ডে পাওয়া যাবে, তাই কোনো ক্লাস মিস হলেও চিন্তা নেই।', '/assets/images/demo/course-practical-accounts-executive-course.svg', 6500, 8000, '3 months · 24 live classes', 'live', 'Md. Saddam Hossain', 'Beginner to Advanced', 'Fresh graduates (BBA/MBA/Honours) who want an accounts job
Junior accountants who want to become confident
Small business owners who keep their own books
Anyone switching career into accounting', 'Double-entry system, Debit & Credit rules with real vouchers
Journal, Ledger, Trial Balance & adjustments
Bank Reconciliation Statement
Financial Statements: Income Statement, Balance Sheet, Cash Flow
Complete Tally Prime: company, ledgers, vouchers, inventory, reports
Excel for accounts: VLOOKUP, SUMIFS, Pivot Table, reports
Basics of VAT & TDS/VDS in Bangladesh
CV writing & interview preparation', '24 LIVE classes + class recordings
Practice files & real-company vouchers
Tally Prime + Excel included
Certificate of completion
WhatsApp support group', 'Friday & Saturday', '8:00 PM – 10:00 PM', '2026-11-06', 'Zoom', '', true, 'published', 1),
  ('056a501b-3860-5ed8-997a-7a3f4af54632', 'tally-prime-practical-course', 'Tally Prime Practical Course', 'Tally Prime দিয়ে একটি কোম্পানির সম্পূর্ণ হিসাব রাখা শিখুন — নিজের সময়ে, রেকর্ডেড ভিডিওতে।', 'এই রেকর্ডেড কোর্সে Tally Prime-এর শুরু থেকে রিপোর্ট পর্যন্ত সবকিছু ধাপে ধাপে দেখানো হয়েছে। প্রতিটি ভিডিওর সাথে প্র্যাকটিস ফাইল আছে, যাতে আপনি নিজে করে দেখতে পারেন।', '/assets/images/demo/course-tally-prime-practical-course.svg', 2500, 3500, '12 hours · 16 lessons', 'recorded', 'Md. Saddam Hossain', 'Beginner', 'Students who want to learn Tally Prime from zero
Accountants moving from manual books to software
Business owners using Tally', 'Company creation & features setup
Ledger & group creation
All voucher types: payment, receipt, contra, journal, sales, purchase
Inventory: stock items, godowns, units
Bank reconciliation in Tally
Day Book, Trial Balance, P&L and Balance Sheet reports
Backup, restore & data security', 'Lifetime access
Practice files for every lesson
Watch on mobile or computer
WhatsApp support', null, null, null, null, '', false, 'published', 2),
  ('d11a3ada-64fe-5065-b2f2-28725ec72f47', 'excel-for-accounting', 'Excel for Accounting', 'একাউন্টস বিভাগের দৈনন্দিন কাজ Excel-এ দ্রুত ও নির্ভুলভাবে করার জন্য প্রয়োজনীয় সব ফাংশন ও রিপোর্ট।', 'একজন accountant-এর দিনের বড় একটা সময় যায় Excel-এ। এই কোর্সে শিখবেন কীভাবে ledger, aging report, salary sheet, bank reconciliation ও MIS report Excel-এ তৈরি করতে হয় — কম সময়ে, কম ভুলে।', '/assets/images/demo/course-excel-for-accounting.svg', 1500, 2000, '8 hours · 12 lessons', 'recorded', 'Md. Saddam Hossain', 'Beginner to Intermediate', 'Accounts & finance professionals
Students preparing for accounts jobs
Anyone who makes reports in Excel', 'Formatting & data entry the professional way
SUM, SUMIF, SUMIFS, COUNTIFS
VLOOKUP, XLOOKUP, INDEX-MATCH
IF, IFERROR and nested logic
Pivot Tables & charts for MIS reports
Salary sheet, aging report & reconciliation templates', 'Ready-made accounting templates
Lifetime access
Practice workbook for every lesson', null, null, null, null, '', false, 'published', 3)
on conflict do nothing;

insert into public.course_modules (id, course_id, title, description, sort_order) values
  ('bc7f43ea-b924-5a67-a0f2-0584924092d7', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Accounting Foundation', null, 1),
  ('c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Ledger to Financial Statements', null, 2),
  ('aedf8c0c-d8f3-56d8-a72f-6a6bbd201eba', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Tally Prime in Practice', null, 3),
  ('f8c69644-45fd-55bd-873a-a70084e4fd3d', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Excel for Accounts', null, 4),
  ('bc98b056-6c7a-587d-8566-fcb7f06f0653', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Career Preparation', null, 5),
  ('2c923b97-6175-5603-a69f-bd36769f3cd7', '056a501b-3860-5ed8-997a-7a3f4af54632', 'Getting Started', null, 1),
  ('091f7398-8cda-52c2-b5f2-e4785d5f289d', '056a501b-3860-5ed8-997a-7a3f4af54632', 'Masters', null, 2),
  ('c2cff9c3-6885-5f82-8eac-dd08c224daaa', '056a501b-3860-5ed8-997a-7a3f4af54632', 'Vouchers', null, 3),
  ('f447a66b-18ef-552f-911e-93c299d42b8b', '056a501b-3860-5ed8-997a-7a3f4af54632', 'Reports', null, 4),
  ('4941adc1-dfd8-5047-86a6-5967d94aecbe', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'Excel Basics for Accountants', null, 1),
  ('ee20c1f4-ea84-5665-9121-87498207a49d', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'Formulas that Save Hours', null, 2),
  ('a5dfd397-c36c-54d1-8667-78af8627cbb8', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'Reports', null, 3)
on conflict do nothing;

insert into public.lessons (id, course_id, module_id, title, description, video_url, duration, is_free, sort_order) values
  ('276418fc-73aa-564d-bf02-cbf39fc6478b', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc7f43ea-b924-5a67-a0f2-0584924092d7', 'Welcome & how this course works', null, '', '12 min', true, 1),
  ('78c8d513-b75f-5e27-8d43-f135b6fcb0f4', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc7f43ea-b924-5a67-a0f2-0584924092d7', 'Accounting equation & double-entry system', null, '', '55 min', false, 2),
  ('46b9bfd2-ed2d-5b98-8295-864a5ae8be5d', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc7f43ea-b924-5a67-a0f2-0584924092d7', 'Debit & Credit rules with real vouchers', null, '', '60 min', false, 3),
  ('9590e186-1ef1-50a5-9c93-e75fd14e0de1', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc7f43ea-b924-5a67-a0f2-0584924092d7', 'Journal entry practice — 30 transactions', null, '', '75 min', false, 4),
  ('3f338355-f4f0-53d3-9437-ee4c3f9cbf19', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', 'Posting to the Ledger', null, '', '50 min', false, 1),
  ('851c7329-3bc8-53b5-9463-f9a5094c3f8d', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', 'Trial Balance & finding errors', null, '', '45 min', false, 2),
  ('14f00a79-47c5-5397-a3df-fbbe40b834c5', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', 'Adjustments: accruals, prepayments, depreciation', null, '', '70 min', false, 3),
  ('4a8abace-eea8-5dec-bdd6-c630e683e003', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', 'Income Statement & Balance Sheet', null, '', '65 min', false, 4),
  ('2561a4f9-3e5a-5c6a-97f2-b7c0b3a582df', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'c6072e3d-f69f-5e1c-ac55-6ef92d2b5795', 'Bank Reconciliation Statement', null, '', '50 min', false, 5),
  ('8f5b415c-275a-53ec-9f46-e3a5f3fb241d', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'aedf8c0c-d8f3-56d8-a72f-6a6bbd201eba', 'Company creation & configuration', null, '', '40 min', false, 1),
  ('f2e0848d-fb16-538f-aff5-74319be7ffaf', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'aedf8c0c-d8f3-56d8-a72f-6a6bbd201eba', 'Ledgers, groups & voucher types', null, '', '55 min', false, 2),
  ('3b8c9f6e-730d-53a4-9297-75e77ab159f1', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'aedf8c0c-d8f3-56d8-a72f-6a6bbd201eba', 'Purchase, sales, payment & receipt entries', null, '', '70 min', false, 3),
  ('040be6d5-499f-5177-a275-f83c2b68c57d', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'aedf8c0c-d8f3-56d8-a72f-6a6bbd201eba', 'Inventory & stock reports', null, '', '60 min', false, 4),
  ('15fcba37-e95c-5f15-a01b-98f1ee26c383', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'f8c69644-45fd-55bd-873a-a70084e4fd3d', 'Excel essentials for accountants', null, '', '45 min', false, 1),
  ('ca9c6495-63b0-5a27-b1fe-bac544f5eebd', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'f8c69644-45fd-55bd-873a-a70084e4fd3d', 'VLOOKUP / XLOOKUP & SUMIFS', null, '', '55 min', false, 2),
  ('63dfa6fe-dba6-5e61-9c84-113aa7c12108', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'f8c69644-45fd-55bd-873a-a70084e4fd3d', 'Pivot Table reports', null, '', '50 min', false, 3),
  ('e236872f-1201-5c6c-a0f2-c1d447561923', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc98b056-6c7a-587d-8566-fcb7f06f0653', 'VAT, TDS & VDS basics', null, '', '60 min', false, 1),
  ('f3ef0d39-3f32-54b1-931e-7caec9209435', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'bc98b056-6c7a-587d-8566-fcb7f06f0653', 'CV & interview preparation', null, '', '45 min', false, 2),
  ('bb750f9f-9d76-58d5-b498-47a5c8a82324', '056a501b-3860-5ed8-997a-7a3f4af54632', '2c923b97-6175-5603-a69f-bd36769f3cd7', 'Introduction to Tally Prime', null, '', '10 min', true, 1),
  ('57314f3b-e3d9-5840-9435-cf94beb29145', '056a501b-3860-5ed8-997a-7a3f4af54632', '2c923b97-6175-5603-a69f-bd36769f3cd7', 'Installing Tally Prime & interface tour', null, '', '14 min', true, 2),
  ('9c3a2748-abaf-5d7f-8a2c-b508cda5042f', '056a501b-3860-5ed8-997a-7a3f4af54632', '2c923b97-6175-5603-a69f-bd36769f3cd7', 'Company creation & F11 features', null, '', '25 min', false, 3),
  ('d43ef577-3fe2-5d1a-925d-846220bea552', '056a501b-3860-5ed8-997a-7a3f4af54632', '091f7398-8cda-52c2-b5f2-e4785d5f289d', 'Groups & ledgers', null, '', '35 min', false, 1),
  ('ceca7dd3-2104-564b-839a-e9f2230567c8', '056a501b-3860-5ed8-997a-7a3f4af54632', '091f7398-8cda-52c2-b5f2-e4785d5f289d', 'Stock groups, items & units', null, '', '30 min', false, 2),
  ('466b3ed0-a98c-5018-a0ee-efeca54b89c4', '056a501b-3860-5ed8-997a-7a3f4af54632', '091f7398-8cda-52c2-b5f2-e4785d5f289d', 'Cost centres', null, '', '20 min', false, 3),
  ('732128c4-bd18-5929-94f5-45d14de33c9a', '056a501b-3860-5ed8-997a-7a3f4af54632', 'c2cff9c3-6885-5f82-8eac-dd08c224daaa', 'Payment, receipt & contra vouchers', null, '', '45 min', false, 1),
  ('b5c4b72f-0fe5-58b4-ba2c-64e91d33d44e', '056a501b-3860-5ed8-997a-7a3f4af54632', 'c2cff9c3-6885-5f82-8eac-dd08c224daaa', 'Sales & purchase vouchers', null, '', '50 min', false, 2),
  ('fd146d2b-75e1-540d-a6d0-93c2b823879f', '056a501b-3860-5ed8-997a-7a3f4af54632', 'c2cff9c3-6885-5f82-8eac-dd08c224daaa', 'Journal, debit note & credit note', null, '', '40 min', false, 3),
  ('2a3238dd-c3cc-5dd9-88ce-52f7dadeb693', '056a501b-3860-5ed8-997a-7a3f4af54632', 'c2cff9c3-6885-5f82-8eac-dd08c224daaa', 'Bank reconciliation in Tally', null, '', '30 min', false, 4),
  ('9c658b7e-fbdb-5471-a74f-db15258bb050', '056a501b-3860-5ed8-997a-7a3f4af54632', 'f447a66b-18ef-552f-911e-93c299d42b8b', 'Day Book & ledger reports', null, '', '25 min', false, 1),
  ('8015ed5e-f12b-5953-816e-945aa0b4b617', '056a501b-3860-5ed8-997a-7a3f4af54632', 'f447a66b-18ef-552f-911e-93c299d42b8b', 'Trial Balance, P&L and Balance Sheet', null, '', '35 min', false, 2),
  ('8b855d4c-c82b-5a53-960c-707091dc86a3', '056a501b-3860-5ed8-997a-7a3f4af54632', 'f447a66b-18ef-552f-911e-93c299d42b8b', 'Stock summary & inventory reports', null, '', '25 min', false, 3),
  ('282dcec4-9c9c-5278-a9db-c6f654263d97', '056a501b-3860-5ed8-997a-7a3f4af54632', 'f447a66b-18ef-552f-911e-93c299d42b8b', 'Backup, restore & export to Excel', null, '', '20 min', false, 4),
  ('d8785a30-1c3e-5946-8c64-e4128ccee04f', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', '4941adc1-dfd8-5047-86a6-5967d94aecbe', 'Why Excel matters in accounts', null, '', '8 min', true, 1),
  ('d85e877a-7c13-56f2-b3a5-c2f173719029', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', '4941adc1-dfd8-5047-86a6-5967d94aecbe', 'Formatting, tables & shortcuts', null, '', '30 min', false, 2),
  ('edb4f3d3-2ffc-5a00-aacd-01a2b37b8bad', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', '4941adc1-dfd8-5047-86a6-5967d94aecbe', 'Number formats, dates & data validation', null, '', '25 min', false, 3),
  ('2f1964a9-3f4f-5abc-88d5-afb7f5f6154f', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'ee20c1f4-ea84-5665-9121-87498207a49d', 'SUMIF, SUMIFS & COUNTIFS', null, '', '35 min', false, 1),
  ('89bef3f7-616f-5ffc-ad62-492aedf64b20', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'ee20c1f4-ea84-5665-9121-87498207a49d', 'VLOOKUP, XLOOKUP & INDEX-MATCH', null, '', '45 min', false, 2),
  ('e992e87e-46f2-50c0-9fab-23c2b9fdefd7', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'ee20c1f4-ea84-5665-9121-87498207a49d', 'IF, IFERROR & nested logic', null, '', '30 min', false, 3),
  ('11f59d03-8e1b-5cdd-89a4-bbde38503e92', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Pivot Tables for MIS', null, '', '40 min', false, 1),
  ('afe460dc-005a-5020-a912-94a16348d4ad', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Charts & dashboards', null, '', '30 min', false, 2),
  ('89123440-c351-5e17-b220-2bf1f6c306a2', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Salary sheet template', null, '', '35 min', false, 3),
  ('8a869cb2-00c1-577d-a55c-f984736178be', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Customer aging report', null, '', '30 min', false, 4),
  ('d6f0b803-46b3-52f1-a881-124267193832', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Bank reconciliation in Excel', null, '', '30 min', false, 5),
  ('0c08c30c-be18-5c57-ab34-0a0ac2a35559', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'a5dfd397-c36c-54d1-8667-78af8627cbb8', 'Protecting & sharing workbooks', null, '', '15 min', false, 6)
on conflict do nothing;

insert into public.course_faqs (id, course_id, question, answer, sort_order) values
  ('711e7da7-8429-5568-8604-27eefce04b94', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'ক্লাস কোথায় হবে?', 'সব ক্লাস Zoom-এ LIVE হবে। ভর্তি নিশ্চিত হলে ড্যাশবোর্ডে Meeting Link দেখতে পাবেন।', 1),
  ('d99c3bfc-f783-5fca-9075-7bd835d928ac', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'কোনো ক্লাস মিস হলে কী করব?', 'প্রতিটি ক্লাসের রেকর্ডিং আপনার ড্যাশবোর্ডে দেওয়া হবে।', 2),
  ('ce213db8-64a1-578a-a472-8cf30fe9e366', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'আগে একাউন্টিং জানা লাগবে?', 'না। একদম শুরু থেকে শেখানো হবে।', 3),
  ('52a3d55c-333a-5a31-8bf3-a2d00584f03a', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'সার্টিফিকেট দেওয়া হবে?', 'হ্যাঁ, কোর্স সম্পন্ন করলে Certificate of Completion দেওয়া হবে।', 4),
  ('7e15d788-ec90-5f00-aaaf-524969809d66', '056a501b-3860-5ed8-997a-7a3f4af54632', 'কোর্সটি কতদিন দেখতে পারব?', 'এক্সেস দেওয়ার পর কোনো মেয়াদ নির্ধারণ না থাকলে আজীবন দেখতে পারবেন।', 1),
  ('4026c160-fa1f-5b73-94ee-8fae255a9f8d', '056a501b-3860-5ed8-997a-7a3f4af54632', 'মোবাইলে দেখা যাবে?', 'হ্যাঁ, মোবাইল ও কম্পিউটার দুটোতেই দেখা যাবে।', 2),
  ('9431f4f9-5482-5837-b3c8-5874bf7e6465', 'd11a3ada-64fe-5065-b2f2-28725ec72f47', 'কোন Excel ভার্সন লাগবে?', 'Excel 2016 বা তার পরের যেকোনো ভার্সন; XLOOKUP-এর জন্য Microsoft 365/2021।', 1)
on conflict do nothing;

insert into public.live_classes (id, course_id, title, class_date, start_time, platform, meeting_link, meeting_id, passcode, notes) values
  ('258546ed-4f92-5a75-a140-baf7adfa1798', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Orientation & Class 1', '2026-11-06', '8:00 PM', 'Zoom', 'https://zoom.us/j/0000000000', '000 000 0000', '[PLACEHOLDER]', 'Link will be updated before class.'),
  ('76d1240a-9291-5bb6-bd87-3aaa534e7287', '1ca0da8c-52e4-5934-a2f3-249b7db18d4d', 'Class 2 — Debit & Credit rules', '2026-11-07', '8:00 PM', 'Zoom', 'https://zoom.us/j/0000000000', '000 000 0000', '[PLACEHOLDER]', 'Link will be updated before class.')
on conflict do nothing;

insert into public.ebooks (id, slug, title, short_description, description, author, pages, price, old_price, cover_url, sample_url, is_featured, status, sort_order) values
  ('77f23fc5-ae64-5be0-91e8-5284729fcfb0', 'tally-prime-gold-ebook', 'Tally Prime Gold E-book', 'Tally Prime-এর সম্পূর্ণ গাইড — স্ক্রিনশটসহ ধাপে ধাপে, বাংলায়।', 'এই ই-বুকে Tally Prime-এর company creation, ledger, সব ধরনের voucher, inventory, bank reconciliation এবং রিপোর্ট — প্রতিটি বিষয় স্ক্রিনশট ও উদাহরণসহ বাংলায় ব্যাখ্যা করা হয়েছে। অনুশীলনের জন্য ৫০+ practice problem রয়েছে।', 'Md. Saddam Hossain', 180, 450, 600, '/assets/images/demo/ebook-tally-prime-gold-ebook.svg', '', true, 'published', 1),
  ('bf62492c-b1bd-5f03-bb5f-702e5d6562db', 'practical-accounting-journal', 'Practical Accounting Journal', '২০০+ বাস্তব লেনদেনের Journal Entry — ব্যাখ্যাসহ।', 'অফিসে প্রতিদিন যে লেনদেনগুলো হয় — ক্রয়, বিক্রয়, বেতন, ভাড়া, ব্যাংক, VAT, TDS, অগ্রিম, অবচয় — তার ২০০+ Journal Entry ব্যাখ্যাসহ। ইন্টারভিউ প্রস্তুতির জন্যও দারুণ কাজে লাগবে।', 'Md. Saddam Hossain', 120, 350, 450, '/assets/images/demo/ebook-practical-accounting-journal.svg', '', true, 'published', 2),
  ('3d3f3086-91c0-503c-a022-a1291aa32c40', 'excel-for-accounting-ebook', 'Excel for Accounting', 'Accountant-দের জন্য দরকারি Excel ফাংশন ও রিপোর্ট টেমপ্লেট।', 'SUMIFS, VLOOKUP/XLOOKUP, Pivot Table থেকে শুরু করে salary sheet, aging report ও reconciliation template — একাউন্টস বিভাগের জন্য Excel-এর একটি প্র্যাক্টিক্যাল হ্যান্ডবুক।', 'Md. Saddam Hossain', 95, 300, 400, '/assets/images/demo/ebook-excel-for-accounting-ebook.svg', '', true, 'published', 3)
on conflict do nothing;

insert into public.blog_posts (id, slug, title, featured_image, category, short_description, content, author, published_at, status) values
  ('7f71bea9-44f3-59cb-a871-0a3edfc72f11', 'debit-credit-rules-made-easy', 'Debit ও Credit-এর নিয়ম: সহজ ভাষায়', '/assets/images/demo/blog-debit-credit-rules-made-easy.svg', 'Accounting', 'কোন হিসাব Debit হবে আর কোনটা Credit — মুখস্থ না করে বুঝে নেওয়ার সহজ উপায়।', 'একাউন্টিং শেখার শুরুতেই সবচেয়ে বেশি যে প্রশ্নটা আসে: **কোনটা Debit, কোনটা Credit?** নিয়মটা বুঝে ফেললে আর মুখস্থ করতে হয় না।

## Accounting Equation দিয়ে শুরু

Assets = Liabilities + Owner''s Equity. প্রতিটি লেনদেনে এই সমীকরণের দুই পাশ সবসময় সমান থাকে — এটাই double-entry system।

## পাঁচ ধরনের হিসাবের নিয়ম

- **Assets** (Cash, Bank, Furniture): বাড়লে Debit, কমলে Credit
- **Expenses** (Salary, Rent): বাড়লে Debit, কমলে Credit
- **Liabilities** (Loan, Payable): বাড়লে Credit, কমলে Debit
- **Income** (Sales, Commission): বাড়লে Credit, কমলে Debit
- **Owner''s Equity** (Capital): বাড়লে Credit, কমলে Debit

## একটি উদাহরণ

অফিস ভাড়া ২০,০০০ টাকা ব্যাংকের মাধ্যমে পরিশোধ করা হলো। এখানে Rent (expense) বাড়ছে, তাই **Rent A/c Debit**; আর Bank (asset) কমছে, তাই **Bank A/c Credit**।

নিয়মিত অনুশীলন করলে কয়েক দিনের মধ্যেই Journal Entry দেওয়া সহজ হয়ে যাবে।', 'Md. Saddam Hossain', '2026-09-20', 'published'),
  ('26d8b557-dc75-57f4-8a2b-942b95f0affa', 'excel-functions-every-accountant-needs', '7 Excel Functions Every Accountant Should Know', '/assets/images/demo/blog-excel-functions-every-accountant-needs.svg', 'Excel', 'SUMIFS, XLOOKUP, Pivot Tables and a few more — the functions that save accountants hours every week.', 'Most accounts work in Bangladesh still ends up in Excel. These seven functions cover the majority of daily reporting.

## 1. SUMIFS
Adds numbers that match several conditions — for example, total sales of one customer in one month.

## 2. COUNTIFS
Counts rows that match conditions, such as the number of unpaid invoices older than 30 days.

## 3. XLOOKUP (or VLOOKUP)
Pulls a value from another table — the ledger name for a code, or a customer''s credit limit.

## 4. IF and IFERROR
Adds logic to a sheet and hides ugly #N/A errors in reports.

## 5. EOMONTH
Returns the last date of a month. Very useful for aging reports and accruals.

## 6. ROUND
Keeps totals matching the books. Always round at the line level when invoices are rounded.

## 7. Pivot Tables
Not a function, but the fastest way to turn thousands of transactions into a monthly MIS summary.

Practise each one with your own company data — that is how they stick.', 'Md. Saddam Hossain', '2026-09-12', 'published'),
  ('0fb46f09-a364-5bcc-86d1-413c5f5df5fb', 'accounts-executive-interview-preparation', 'Accounts Executive ইন্টারভিউয়ের প্রস্তুতি: যা জানতেই হবে', '/assets/images/demo/blog-accounts-executive-interview-preparation.svg', 'Job Preparation', 'ইন্টারভিউতে সাধারণত যে প্রশ্নগুলো আসে এবং কীভাবে প্রস্তুতি নেবেন।', 'Accounts Executive পদের ইন্টারভিউতে সাধারণত থিওরির চেয়ে **প্র্যাক্টিক্যাল প্রশ্ন** বেশি আসে।

## যে বিষয়গুলো অবশ্যই ঝালিয়ে নিন

- Journal Entry: বেতন, ভাড়া, অগ্রিম, অবচয়, ক্রয়-বিক্রয়
- Bank Reconciliation Statement কেন ও কীভাবে করা হয়
- Trial Balance না মিললে কী কী চেক করবেন
- VAT, TDS ও VDS-এর মৌলিক ধারণা
- Tally Prime-এ voucher entry ও রিপোর্ট
- Excel-এ SUMIFS, VLOOKUP ও Pivot Table

## ইন্টারভিউয়ের দিন

সময়ের আগে পৌঁছান, CV-এর একটি প্রিন্ট সাথে রাখুন, এবং যে প্রশ্নের উত্তর জানেন না তা সৎভাবে বলুন — সাথে বলুন আপনি কীভাবে সেটা খুঁজে বের করতেন।

প্রস্তুতি যত প্র্যাক্টিক্যাল হবে, আত্মবিশ্বাসও তত বাড়বে।', 'Md. Saddam Hossain', '2026-09-02', 'published')
on conflict do nothing;

insert into public.testimonials (id, name, designation, message, photo_url, rating, status, sort_order) values
  ('a3263b63-a2ea-5718-bd9c-4fda5d18e70e', 'Student Name (Sample)', 'Accounts Executive (sample)', 'This is a sample review. Replace it with a real student review from Admin → Testimonials.', '', 5, 'published', 1),
  ('c25fb3e0-8a69-559e-b5df-fb991e880788', 'Student Name (Sample)', 'Junior Accountant (sample)', 'নমুনা রিভিউ — Admin → Testimonials থেকে আপনার শিক্ষার্থীর আসল মতামত দিয়ে এটি বদলে দিন।', '', 5, 'published', 2),
  ('d8a97fa3-49d2-5ab3-8a7b-05354b32a076', 'Student Name (Sample)', 'BBA Graduate (sample)', 'Sample text. Real reviews with the student’s permission build the most trust with new visitors.', '', 5, 'published', 3)
on conflict do nothing;

