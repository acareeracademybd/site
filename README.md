# ACCOUNTING CAREER ACADEMY — Website

দ্রুত, হালকা ও নিরাপদ একটি শিক্ষামূলক ওয়েবসাইট: LIVE ও Recorded কোর্স, ই-বুক বিক্রি, ব্লগ, ফ্রি YouTube ক্লাস, bKash/Nagad ম্যানুয়াল পেমেন্ট, WhatsApp কনফার্মেশন, **Email + Access Code** লগইন, Student Dashboard, নিরাপদ PDF ডাউনলোড এবং সম্পূর্ণ Admin Panel।

- **Frontend:** শুধু HTML + CSS + Vanilla JavaScript (কোনো React/framework নেই)
- **Hosting:** Cloudflare Pages (ফ্রি) · **Database / Login / Files:** Supabase (ফ্রি)
- **খরচ:** শুধু ডোমেইনের বার্ষিক ফি। হোস্টিং ফ্রি।

> কোনো কোড না জেনেও নিচের ধাপগুলো অনুসরণ করে ওয়েবসাইট চালু করা যাবে। প্রথমবার সব মিলিয়ে ১–২ ঘণ্টা লাগতে পারে।

---

## সূচিপত্র
1. [ফাইল কাঠামো](#ফাইল-কাঠামো)
2. [সেটআপ গাইড — ১৬টি ধাপ](#সেটআপ-গাইড--১৬টি-ধাপ)
3. [প্রতিদিনের কাজ (Admin Panel)](#প্রতিদিনের-কাজ-admin-panel)
4. [নিরাপত্তা কীভাবে কাজ করে](#নিরাপত্তা-কীভাবে-কাজ-করে)
5. [সমস্যা ও সমাধান](#সমস্যা-ও-সমাধান)
6. [ভবিষ্যতে যা যোগ করা যাবে](#ভবিষ্যতে-যা-যোগ-করা-যাবে)

---

## ফাইল কাঠামো

```
/                       ← পাবলিক পেজ
  index.html            হোম
  courses.html          সব কোর্স            (ঠিকানা: /courses)
  recorded-courses.html রেকর্ডেড কোর্স       (/recorded-courses)
  course-details.html   কোর্সের বিস্তারিত     (/course/কোর্সের-slug)
  ebooks.html           ই-বুক স্টোর          (/ebooks)
  ebook-details.html    ই-বুকের বিস্তারিত     (/ebook/slug)
  blog.html, blog-details.html                (/blog, /blog/slug)
  about.html, contact.html
  checkout.html         পেমেন্ট ফর্ম (bKash/Nagad → WhatsApp)
  login.html            Student Login (Email + Access Code)
  dashboard.html        Student Dashboard
  learn.html            কোর্স প্লেয়ার (Module → Lesson)
  404.html
  _redirects, _headers  Cloudflare-এর সুন্দর URL, নিরাপত্তা ও ক্যাশ সেটিং
  robots.txt, sitemap.xml, site.webmanifest

/admin/                 ← Admin Panel (login.html, index.html, courses, lessons,
                          students, payments, access-codes, ebooks, blog,
                          testimonials, settings, messages)

/css/   style.css, responsive.css, admin.css
/js/    config.js      ⚙️ Supabase-এর ঠিকানা ও key (সেটআপের সময় একবার বদলাতে হবে)
        supabase.js    ডাটাবেস সংযোগ        settings.js  হেডার/ফুটার/সেটিংস
        auth.js        স্টুডেন্ট লগইন         dashboard.js, learn.js
        courses.js, ebooks.js, blog.js, payments.js (checkout), contact.js, about.js, home.js
        ui.js, utils.js, demo-data.js (শুধু ডেমো মোডে)
        admin.js + admin/*.js   Admin Panel
        vendor/supabase.js      Supabase-এর অফিসিয়াল লাইব্রেরি (শুধু লগইন/ড্যাশবোর্ড/অ্যাডমিন পেজে লোড হয়)
/assets/ logo/ (লোগো, favicon), icons/, images/, fonts/ (Hind Siliguri — বাংলা ফন্ট)
/supabase/ schema.sql (ডাটাবেস + নিরাপত্তা নিয়ম), seed.sql (নমুনা কন্টেন্ট)
```

**ডেমো মোড:** `js/config.js` পূরণ না করা পর্যন্ত সাইটটি নমুনা কন্টেন্ট দেখায় (উপরে হলুদ "Demo mode" বার থাকে)। লগইন ও অ্যাডমিন কাজ করবে ধাপ ৮-এর পর।

**লোগো:** `assets/logo/` ফোল্ডারে — `logo.svg` (মূল লোগো), `logo-white.svg` (গাঢ় ব্যাকগ্রাউন্ডের জন্য), `logo-compact.svg` (মোবাইল/ছোট), `logo-mark.svg` ও `favicon.svg` (আইকন), `logo.png` (Facebook ইত্যাদির জন্য)।

---

## সেটআপ গাইড — ১৬টি ধাপ

### STEP 1 — GitHub repository তৈরি করুন
1. <https://github.com> এ ফ্রি অ্যাকাউন্ট খুলুন (না থাকলে)।
2. উপরে ডানে **+** → **New repository**।
3. Repository name: `aca-website` · **Private** নির্বাচন করুন → **Create repository**।

### STEP 2 — প্রজেক্ট আপলোড করুন
1. এই zip ফাইলটি কম্পিউটারে extract করুন।
2. নতুন repository-র পেজে **uploading an existing file** লিংকে ক্লিক করুন।
3. extract করা ফোল্ডারের **ভেতরের সব ফাইল ও ফোল্ডার** (index.html, css, js, admin, assets, supabase …) টেনে এনে ছেড়ে দিন।
   ⚠️ `_redirects` ও `_headers` ফাইল দুটিও যেন আপলোড হয় (কিছু কম্পিউটারে `_` দিয়ে শুরু ফাইল লুকানো থাকে)।
4. নিচে **Commit changes** চাপুন।

### STEP 3 — Supabase প্রজেক্ট তৈরি করুন
1. <https://supabase.com> → **Start your project** → GitHub দিয়ে লগইন।
2. **New project** → Name: `accounting-career-academy`, একটি শক্তিশালী **Database Password** দিন (কোথাও লিখে রাখুন), Region: **Singapore** (বাংলাদেশের সবচেয়ে কাছে) → **Create new project**।
3. ১–২ মিনিট অপেক্ষা করুন।

### STEP 4 — ডাটাবেস টেবিল তৈরি করুন
1. বাম মেনু → **SQL Editor** → **New query**।
2. `supabase/schema.sql` ফাইলটি Notepad-এ খুলে **সব লেখা কপি** করে এখানে পেস্ট করুন → **Run**।
   "Success" দেখাবে (কিছু "NOTICE … does not exist, skipping" দেখালে সমস্যা নেই)।
3. আবার **New query** → `supabase/seed.sql`-এর সব লেখা পেস্ট → **Run**। এতে নমুনা কোর্স, ই-বুক, ব্লগ ও সেটিংস যোগ হবে (পরে Admin Panel থেকে বদলাবেন/মুছবেন)।

> schema.sql পরে আবার চালালেও আপনার ডাটা মুছে যাবে না।

### STEP 5 — Authentication কনফিগার করুন
1. বাম মেনু → **Authentication** → **Sign In / Providers** (পুরনো ড্যাশবোর্ডে: *Providers* / *Settings*)।
2. **Allow new users to sign up** → **ON** রাখুন।
3. **Allow anonymous sign-ins** → **ON** করুন → **Save**।
   (স্টুডেন্ট লগইন এটির ওপর নির্ভর করে। নিরাপত্তা নিয়ে চিন্তা নেই — Access Code সঠিক না হলে এই সেশন দিয়ে কিছুই দেখা যায় না।)
4. **Email** provider চালু থাকবে (Admin লগইনের জন্য)।
5. **Authentication → URL Configuration**: *Site URL*-এ আপাতত পরে পাওয়া `https://….pages.dev` ঠিকানা (ধাপ ৯-এর পর) দিন, ডোমেইন যুক্ত হলে `https://www.আপনার-ডোমেইন.com` দিন। *Redirect URLs*-এ যোগ করুন: `https://www.আপনার-ডোমেইন.com/admin/login` (Admin পাসওয়ার্ড রিসেটের জন্য)।

### STEP 6 — Storage (ফাইল রাখার জায়গা)
কিছু করতে হবে না — schema.sql স্বয়ংক্রিয়ভাবে তিনটি bucket তৈরি করেছে। যাচাই করতে: বাম মেনু → **Storage** → দেখবেন:
| Bucket | কী থাকে | কে দেখতে পারে |
|---|---|---|
| `public-media` | ছবি, কভার, ব্লগের ছবি, ফ্রি স্যাম্পল PDF | সবাই |
| `ebook-files` | বিক্রির ই-বুক PDF | শুধু যে কিনেছে (পেমেন্ট অনুমোদিত) |
| `course-files` | লেসনের ডাউনলোড ফাইল | শুধু ওই কোর্সে ভর্তি শিক্ষার্থী |

### STEP 7 — Admin অ্যাকাউন্ট তৈরি করুন
1. **Authentication → Users → Add user → Create new user**।
2. আপনার ইমেইল ও একটি শক্তিশালী পাসওয়ার্ড দিন, **Auto Confirm User** টিক দিন → **Create user**।
3. **SQL Editor → New query**-তে নিচের লাইনটি লিখুন (ইমেইল বদলে) → **Run**:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'আপনার-ইমেইল@gmail.com';
   ```
   টিমের অন্য কাউকে admin বানাতে একইভাবে user তৈরি করে এই SQL চালান। কাউকে সরাতে:
   `delete from public.admins where email = 'তার-ইমেইল';`

### STEP 8 — ওয়েবসাইটকে Supabase-এর সাথে যুক্ত করুন
1. Supabase → **Project Settings → API Keys** (বা **Data API**)।
   - **Project URL** কপি করুন (যেমন `https://abcdxyz.supabase.co`)।
   - **anon public** key (Legacy API keys ট্যাবে) **অথবা** **Publishable key** (`sb_publishable_…`) কপি করুন।
   - ⛔ **service_role / secret key কখনো কপি করবেন না।**
2. GitHub-এ আপনার repository → `js` ফোল্ডার → `config.js` → ✏️ (Edit) আইকন।
3. এই দুই লাইন বদলান:
   ```js
   SUPABASE_URL: 'https://abcdxyz.supabase.co',
   SUPABASE_ANON_KEY: 'আপনার-anon-বা-publishable-key',
   SITE_URL: 'https://www.আপনার-ডোমেইন.com',
   ```
4. **Commit changes**।

### STEP 9 — Cloudflare Pages-এ ডিপ্লয় করুন
1. <https://dash.cloudflare.com> এ ফ্রি অ্যাকাউন্ট খুলুন।
2. বাম মেনু **Workers & Pages** → **Create** → **Pages** ট্যাব → **Connect to Git** (Import an existing Git repository)।
3. GitHub অনুমতি দিন → `aca-website` নির্বাচন → **Begin setup**।
4. Build settings: **Framework preset: None**, **Build command:** খালি রাখুন, **Build output directory:** `/` → **Save and Deploy**।
5. ১ মিনিট পর `https://aca-website-xxx.pages.dev` ঠিকানা পাবেন — এটাই আপনার লাইভ সাইট।
   এরপর থেকে GitHub-এ যেকোনো পরিবর্তন করলে সাইট নিজে থেকেই আপডেট হবে।

### STEP 10 — কাস্টম ডোমেইন যুক্ত করুন
1. Cloudflare → Workers & Pages → আপনার প্রজেক্ট → **Custom domains** → **Set up a custom domain**।
2. `www.আপনার-ডোমেইন.com` লিখুন → **Continue**।
3. মূল ডোমেইনও (`আপনার-ডোমেইন.com`) একইভাবে যোগ করুন।

### STEP 11 — DNS কনফিগার করুন
**সহজ ও সেরা উপায় (প্রস্তাবিত):** ডোমেইনটি Cloudflare-এ যুক্ত করুন —
1. Cloudflare হোম → **Add a domain** → ডোমেইন লিখুন → **Free** প্ল্যান।
2. Cloudflare দুটি **nameserver** দেবে (যেমন `anna.ns.cloudflare.com`)।
3. যেখান থেকে ডোমেইন কিনেছেন (Namecheap, GoDaddy, বা বাংলাদেশি প্রোভাইডার) সেখানে লগইন করে **Nameservers** অংশে এই দুটি বসান।
4. কয়েক মিনিট থেকে ২৪ ঘণ্টার মধ্যে সক্রিয় হবে; তারপর ধাপ ১০ করলে DNS রেকর্ড স্বয়ংক্রিয়ভাবে তৈরি হবে এবং ফ্রি HTTPS চালু হবে।

**বিকল্প (nameserver না বদলাতে চাইলে):** ডোমেইন প্রোভাইডারের DNS-এ একটি **CNAME** রেকর্ড দিন: Name `www` → Value `aca-website-xxx.pages.dev`।

**ডোমেইন সব ফাইলে বসানো (SEO-র জন্য, একবার করতে হবে):**
GitHub repository পেজে কীবোর্ডে **`.`** (ডট) চাপুন → ব্রাউজারে এডিটর খুলবে → **Ctrl+Shift+H** → উপরের ঘরে `https://www.your-domain.com`, নিচের ঘরে `https://www.আপনার-ডোমেইন.com` লিখে **Replace All** → বাম দিকের Source Control আইকন → **Commit & Push**।

**Google Search Console:** <https://search.google.com/search-console> → **Add property** → *Domain* → ডোমেইন লিখুন → দেখানো TXT রেকর্ডটি Cloudflare → DNS → **Add record** (Type TXT) হিসেবে বসান → Verify। তারপর **Sitemaps** মেনুতে `sitemap.xml` সাবমিট করুন।

### STEP 12 — টেস্ট: স্টুডেন্ট রেজিস্ট্রেশন
1. সাইটে Admin → **Website Settings**-এ আপনার আসল WhatsApp, bKash, Nagad নম্বর দিয়ে **Save** করুন।
2. অন্য ব্রাউজার বা মোবাইলে সাইট খুলুন → একটি কোর্স → **Enroll Now**।
3. নাম, মোবাইল, নিজের অন্য একটি ইমেইল, bKash, একটি পরীক্ষামূলক Transaction ID (যেমন `TEST12345`) দিয়ে **I Have Made Payment**।
4. **WhatsApp-এ কনফার্ম করুন** বাটন চাপলে সব তথ্যসহ মেসেজ তৈরি হবে কিনা দেখুন।

### STEP 13 — টেস্ট: পেমেন্ট অনুমোদন
1. `https://আপনার-সাইট/admin/login` → Admin ইমেইল ও পাসওয়ার্ড।
2. **Payments** → Pending তালিকায় টেস্ট পেমেন্ট → **Approve** → (ইচ্ছা হলে মেয়াদ দিন) → **Approve & give access**।
3. একটি **Access Code** দেখাবে (যেমন `ACA-2026-X7K9-PQ4M`) → **Send on WhatsApp** বা **Copy code**।
   ⚠️ নিরাপত্তার জন্য পুরো কোড শুধু এই একবারই দেখা যায়। হারালে **Students → View / Manage → Generate new code**।

### STEP 14 — টেস্ট: Access Code লগইন
1. স্টুডেন্টের ব্রাউজারে **Login** → ইমেইল + Access Code → Dashboard খুলবে।
2. ভুল কোড দিয়ে চেষ্টা করুন → ঢুকতে দেবে না (৫ বার ভুল হলে ১৫ মিনিট লক)।

### STEP 15 — টেস্ট: কোর্স এক্সেস
1. Admin → **Modules / Lessons** → কোর্স নির্বাচন → একটি লেসনে ✏️ → YouTube (Unlisted) লিংক দিন → Save।
2. স্টুডেন্ট Dashboard → **Continue** → ভিডিও চলছে কিনা দেখুন, **Mark as complete** চাপুন।
3. যে কোর্স কেনা হয়নি সেটির `/learn?course=…` ঠিকানায় গেলে "আপনি এই কোর্সে ভর্তি নন" দেখাবে।

### STEP 16 — টেস্ট: PDF ডাউনলোড
1. Admin → **E-books** → ই-বুকের সারিতে ⬇ (Upload paid PDF) → PDF নির্বাচন।
2. একটি ই-বুকের টেস্ট পেমেন্ট করে Approve করুন।
3. স্টুডেন্ট Dashboard → **My E-books → Download** → PDF নামবে।
4. যে ই-বুক কেনা হয়নি তার কোনো ডাউনলোড লিংক পাওয়া যায় না; ডাউনলোড লিংক ৫ মিনিট পর নিজে থেকেই অকার্যকর হয়।

✅ সব ঠিক থাকলে Admin → **Payments**-এ টেস্ট পেমেন্টগুলো **Delete** করুন এবং **Students**-এ টেস্ট স্টুডেন্টকে Deactivate করুন।

---

## প্রতিদিনের কাজ (Admin Panel)

| কাজ | কোথায় |
|---|---|
| নতুন পেমেন্ট অনুমোদন | **Payments** (বা Dashboard) → Approve → কোড WhatsApp-এ পাঠান |
| WhatsApp-এ তথ্য পেয়েছেন কিন্তু ফর্ম জমা হয়নি | **Payments → Add payment manually** → তারপর Approve |
| কোর্স যোগ/সম্পাদনা/লুকানো | **Courses** (🌐/🔒 বাটনে Publish/Unpublish) |
| মডিউল, লেসন, ভিডিও, ফাইল, FAQ, LIVE ক্লাসের লিংক | **Modules / Lessons** |
| স্টুডেন্টকে কোর্স/ই-বুক দেওয়া, মেয়াদ, ব্লক, নতুন কোড | **Students → View / Manage** |
| কোড বন্ধ/মেয়াদ/নতুন কোড | **Access Codes** |
| ই-বুক ও PDF | **E-books** (⬇ = বিক্রির PDF, 👁 = ফ্রি স্যাম্পল) |
| ব্লগ লেখা | **Blog** (লেখায় `## শিরোনাম`, `- বুলেট`, `**বোল্ড**`) |
| রিভিউ | **Testimonials** — ⚠️ নমুনা (sample) রিভিউগুলো মুছে আসল শিক্ষার্থীর রিভিউ দিন |
| লোগো, ফোন, WhatsApp, Facebook, হিরো লেখা, পরিসংখ্যান, ঘোষণা | **Website Settings** |
| YouTube ডেমো ভিডিও ও চ্যানেল | **YouTube Settings** |
| bKash/Nagad নম্বর | **Payment Settings** |
| প্রশিক্ষকের তথ্য, ছবি, মিশন/ভিশন | **Profile / Trainer** |
| Contact ফর্মের মেসেজ | **Messages** |

**[PLACEHOLDER] চিহ্নিত তথ্য** (প্রশিক্ষকের অর্জন, ফোন নম্বর, নমুনা রিভিউ ইত্যাদি) অবশ্যই বদলে দিন। Admin Dashboard-এর **Setup checklist** দেখাবে কোনগুলো বাকি।

**ভিডিও হোস্টিং টিপ:** পেইড লেসনের ভিডিও YouTube-এ **Unlisted** করে আপলোড করুন (ফ্রি, দ্রুত)। Unlisted লিংক শুধু ভর্তি শিক্ষার্থীরা ওয়েবসাইটে দেখতে পায়; তবে কেউ লিংক কপি করে শেয়ার করলে তা আটকানো যায় না — বেশি সুরক্ষা চাইলে ভবিষ্যতে Vimeo/Bunny Stream (পেইড) ব্যবহার করা যায়।

**ছবির টিপ:** ছবি আপলোডের আগে <https://squoosh.app> দিয়ে WebP/JPG করে ৩০০ KB-এর নিচে রাখুন — সাইট দ্রুত থাকবে।

**Sitemap আপডেট:** নতুন কোর্স/ই-বুক/ব্লগ যোগ করার পর Admin → Website Settings → **SEO → Download sitemap.xml** → GitHub-এ পুরনো `sitemap.xml` ফাইলের জায়গায় আপলোড করুন।

---

## নিরাপত্তা কীভাবে কাজ করে

- **সব অনুমতি ডাটাবেসে যাচাই হয় (Row Level Security)।** কেউ ব্রাউজারের কোড বদলালেও অন্যের কোর্স, লেসন ভিডিও, LIVE ক্লাস লিংক, পেমেন্ট বা PDF দেখতে পারবে না।
- **Access Code** ডাটাবেসে কখনো সরাসরি রাখা হয় না — শুধু SHA-256 "fingerprint"। Admin-ও পরে পুরো কোড দেখতে পায় না।
- লগইনে ভুল কোড ৫ বার → ১৫ মিনিট লক। একজন স্টুডেন্ট সর্বোচ্চ ৫টি ডিভাইসে লগইন থাকতে পারে।
- স্টুডেন্ট **Deactivate**, কোড **Deactivate/Regenerate**, বা মেয়াদ শেষ হলে সঙ্গে সঙ্গে এক্সেস বন্ধ।
- PDF ও লেসন ফাইল private bucket-এ; ডাউনলোড লিংক ৫ মিনিট মেয়াদি ও শুধু ক্রেতার জন্য তৈরি হয়।
- ওয়েবসাইটে শুধু পাবলিক (anon/publishable) key থাকে। **service_role key কোথাও ব্যবহার হয়নি — কখনো `config.js`-এ দেবেন না।**
- ব্লগ ও সব টেক্সট HTML-escape করা হয় (XSS সুরক্ষা); `_headers` ফাইলে Content-Security-Policy ও অন্যান্য নিরাপত্তা হেডার আছে।
- Admin পেজগুলো Google-এ index হয় না।

**মাঝে মাঝে (ঐচ্ছিক) পুরনো anonymous সেশন পরিষ্কার করতে** SQL Editor-এ:
```sql
delete from auth.users where is_anonymous and created_at < now() - interval '60 days'
  and id not in (select auth_uid from public.student_sessions);
```

---

## সমস্যা ও সমাধান

| সমস্যা | সমাধান |
|---|---|
| উপরে হলুদ "Demo mode" বার | `js/config.js` পূরণ করা হয়নি (ধাপ ৮)। |
| লগইনে "Login is not enabled yet" | ধাপ ৫: **Allow anonymous sign-ins** চালু করুন। |
| Admin লগইনে "not an admin" | ধাপ ৭-এর SQL চালানো হয়নি বা ইমেইল ভুল। |
| `/course/...` পেজ 404 | `_redirects` ফাইল GitHub-এ আপলোড হয়নি। |
| পরিবর্তন সাইটে দেখা যাচ্ছে না | ১০ মিনিট অপেক্ষা করুন বা ব্রাউজারে Ctrl+F5। সেটিংস ১০ মিনিট ক্যাশ থাকে। |
| ছবি আপলোড হচ্ছে না | ছবি ৫ MB-এর কম হতে হবে (PNG/JPG/WebP/GIF)। |
| PDF আপলোড হচ্ছে না | Supabase ফ্রি প্ল্যানে প্রতি ফাইল সর্বোচ্চ ৫০ MB। |
| স্টুডেন্ট কোড হারিয়েছে | Students → View / Manage → Generate new code। |
| Supabase প্রজেক্ট "Paused" | ফ্রি প্রজেক্ট ৭ দিন একদম কোনো ব্যবহার না হলে pause হতে পারে — Supabase ড্যাশবোর্ডে **Restore** চাপুন। নিয়মিত ভিজিটর থাকলে এমন হয় না। |
| Supabase কাস্টম ডোমেইন ব্যবহার করলে | `_headers` ফাইলে `connect-src`-এ সেই ডোমেইন যোগ করুন। |

**ফ্রি প্ল্যানের সীমা (যথেষ্ট বড়):** Supabase — ৫০০ MB ডাটাবেস, ১ GB ফাইল স্টোরেজ, ৫০,০০০ মাসিক ইউজার। Cloudflare Pages — সীমাহীন ভিজিটর। ফাইল স্টোরেজ ১ GB ছাড়ালে বড় PDF Google Drive-এ না রেখে Supabase Pro ($25/মাস) বিবেচনা করুন।

---

## ভবিষ্যতে যা যোগ করা যাবে
- **পাসওয়ার্ড লগইন:** `students.auth_user_id` কলাম আগে থেকেই রাখা আছে; Supabase Email লগইন যুক্ত করে এটিতে লিংক করলেই হবে।
- **Drip content:** প্রতিটি লেসনে "Unlock after N days" ইতিমধ্যে কাজ করে (Modules / Lessons → লেসন এডিট)।
- **অটোমেটিক পেমেন্ট (SSLCommerz/bKash PGW):** পেমেন্ট টেবিল ও অনুমোদন ফাংশন (`admin_approve_payment`) একই থাকবে; শুধু একটি Supabase Edge Function যোগ করতে হবে।

---

### ডেভেলপারদের জন্য নোট
- সব ডাটাবেস লজিক `supabase/schema.sql`-এ (টেবিল, RLS policy, `security definer` ফাংশন, storage policy)।
- স্টুডেন্ট লগইন: ব্রাউজার Supabase anonymous session নেয় → `student_login(email, code)` কোড যাচাই করে `student_sessions`-এ auth uid ↔ student লিংক করে → `current_student_id()` সব RLS-এ ব্যবহৃত।
- পাবলিক পেজ ছোট `fetch()` ক্লায়েন্ট ব্যবহার করে; `js/vendor/supabase.js` (supabase-js v2.117, MIT) শুধু লগইন/ড্যাশবোর্ড/অ্যাডমিনে লোড হয়।
- Cache busting: CSS/JS লিংকে `?v=1.0.0` — বড় পরিবর্তনের পর HTML ফাইলগুলোতে সংখ্যাটি বাড়াতে পারেন।
