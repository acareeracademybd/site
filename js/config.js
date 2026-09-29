// =====================================================================
//  ⚙️  WEBSITE CONFIGURATION — the only file you must edit after setup
// ---------------------------------------------------------------------
//  Supabase Dashboard → Project Settings → API (or "API Keys"):
//    • SUPABASE_URL      = "Project URL"
//    • SUPABASE_ANON_KEY = "anon public" key  (or the "Publishable" key)
//
//  ⚠️ NEVER paste the "service_role" / "secret" key here. This file is public.
// =====================================================================

export const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',

  // Your website address (used for sharing links / sitemap)
  SITE_URL: 'https://www.your-domain.com',

  // Currency symbol shown before prices
  CURRENCY: '৳',
};

// While the values above are still placeholders the site runs in DEMO mode
// (public pages show sample content; login/admin show a setup message).
export const IS_CONFIGURED =
  /^https:\/\//.test(CONFIG.SUPABASE_URL) &&
  !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') &&
  !CONFIG.SUPABASE_ANON_KEY.startsWith('YOUR-');
