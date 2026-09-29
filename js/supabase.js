// Database access.
//  • Public pages use a tiny fetch() client (fast, no library download).
//  • Login / dashboard / admin pages load the official Supabase library
//    (/js/vendor/supabase.js) only when needed.
//  • If js/config.js is not filled in yet, public pages show demo content.
import { CONFIG, IS_CONFIGURED } from './config.js';

const REST = CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

function headers() {
  const h = { apikey: CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  // Legacy "anon" keys are JWTs and also go in Authorization; new "sb_publishable_" keys must not.
  if (!CONFIG.SUPABASE_ANON_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + CONFIG.SUPABASE_ANON_KEY;
  return h;
}

async function handle(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && (data.message || data.error_description || data.hint)) || 'Request failed (' + res.status + ')');
  return data;
}

export async function select(table, query = '') {
  return handle(await fetch(`${REST}/${table}?${query}`, { headers: headers() }));
}

export async function rpc(fn, args = {}) {
  return handle(await fetch(`${REST}/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(args) }));
}

// ---------- Official Supabase client (auth, storage) ----------
let sdkPromise;
function loadSdk() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  sdkPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/js/vendor/supabase.js';
    s.onload = () => resolve(window.supabase);
    s.onerror = () => reject(new Error('Could not load the login system. Please check your internet connection.'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

const clients = {};
// kind = 'student' or 'admin' — separate storage so both logins never overwrite each other
export async function getClient(kind = 'student') {
  if (!IS_CONFIGURED) throw new Error('NOT_CONFIGURED');
  if (clients[kind]) return clients[kind];
  const lib = await loadSdk();
  clients[kind] = lib.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { storageKey: kind === 'admin' ? 'aca-admin-auth' : 'aca-student-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return clients[kind];
}

// ---------- Public data (with demo fallback) ----------
let demoPromise;
const demo = () => (demoPromise ||= import('./demo-data.js').then((m) => m.DEMO));
const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const enc = encodeURIComponent;

const COURSE_LIST_COLS = 'id,slug,title,short_description,thumbnail_url,price,old_price,duration,course_type,instructor,level,benefits,schedule_days,class_time,start_date,platform,preview_video_url,is_featured,sort_order';

export const api = {
  async settings() {
    if (!IS_CONFIGURED) return { ...(await demo()).settings };
    const rows = await select('website_settings', 'select=key,value');
    return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  },

  async features() {
    if (!IS_CONFIGURED) return (await demo()).features.slice().sort(byOrder);
    return select('features', 'select=*&status=eq.published&order=sort_order.asc');
  },

  async courses({ type, featured, limit } = {}) {
    if (!IS_CONFIGURED) {
      let list = (await demo()).courses.filter((c) => c.status === 'published');
      if (type) list = list.filter((c) => c.course_type === type);
      if (featured) list = list.filter((c) => c.is_featured);
      list.sort(byOrder);
      return limit ? list.slice(0, limit) : list;
    }
    let q = `select=${COURSE_LIST_COLS}&status=eq.published&order=sort_order.asc,created_at.desc`;
    if (type) q += `&course_type=eq.${enc(type)}`;
    if (featured) q += '&is_featured=is.true';
    if (limit) q += `&limit=${Number(limit)}`;
    return select('courses', q);
  },

  async course(slug) {
    if (!IS_CONFIGURED) return (await demo()).courses.find((c) => c.slug === slug && c.status === 'published') || null;
    const rows = await select('courses', `select=*&slug=eq.${enc(slug)}&status=eq.published&limit=1`);
    return rows[0] || null;
  },

  async curriculum(courseId) {
    if (!IS_CONFIGURED) {
      const d = await demo();
      return d.modules.filter((m) => m.course_id === courseId).sort(byOrder).map((m) => ({
        ...m,
        lessons: d.lessons.filter((l) => l.module_id === m.id).sort(byOrder)
          .map((l) => ({ id: l.id, title: l.title, duration: l.duration, is_free: l.is_free, video_url: l.is_free ? l.video_url : null })),
      }));
    }
    return (await rpc('get_curriculum', { p_course_id: courseId })) || [];
  },

  async faqs(courseId) {
    if (!IS_CONFIGURED) return (await demo()).faqs.filter((f) => f.course_id === courseId).sort(byOrder);
    return select('course_faqs', `select=question,answer&course_id=eq.${enc(courseId)}&order=sort_order.asc`);
  },

  async ebooks({ featured, limit } = {}) {
    if (!IS_CONFIGURED) {
      let list = (await demo()).ebooks.filter((e) => e.status === 'published');
      if (featured) list = list.filter((e) => e.is_featured);
      list.sort(byOrder);
      return limit ? list.slice(0, limit) : list;
    }
    let q = 'select=id,slug,title,short_description,author,pages,price,old_price,cover_url,sample_url,is_featured&status=eq.published&order=sort_order.asc,created_at.desc';
    if (featured) q += '&is_featured=is.true';
    if (limit) q += `&limit=${Number(limit)}`;
    return select('ebooks', q);
  },

  async ebook(slug) {
    if (!IS_CONFIGURED) return (await demo()).ebooks.find((e) => e.slug === slug && e.status === 'published') || null;
    const rows = await select('ebooks', `select=*&slug=eq.${enc(slug)}&status=eq.published&limit=1`);
    return rows[0] || null;
  },

  async posts({ limit, category } = {}) {
    if (!IS_CONFIGURED) {
      let list = (await demo()).posts.filter((p) => p.status === 'published');
      if (category) list = list.filter((p) => p.category === category);
      list.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
      return limit ? list.slice(0, limit) : list;
    }
    let q = 'select=id,slug,title,featured_image,category,short_description,author,published_at&status=eq.published&order=published_at.desc,created_at.desc';
    if (category) q += `&category=eq.${enc(category)}`;
    if (limit) q += `&limit=${Number(limit)}`;
    return select('blog_posts', q);
  },

  async post(slug) {
    if (!IS_CONFIGURED) return (await demo()).posts.find((p) => p.slug === slug && p.status === 'published') || null;
    const rows = await select('blog_posts', `select=*&slug=eq.${enc(slug)}&status=eq.published&limit=1`);
    return rows[0] || null;
  },

  async testimonials() {
    if (!IS_CONFIGURED) return (await demo()).testimonials.filter((t) => t.status === 'published').sort(byOrder);
    return select('testimonials', 'select=*&status=eq.published&order=sort_order.asc,created_at.desc&limit=12');
  },

  async submitPayment(args) {
    if (!IS_CONFIGURED) return { id: 'demo', product_title: args.product_title, amount: args.amount, demo: true };
    return rpc('submit_payment', {
      p_name: args.name, p_email: args.email, p_mobile: args.mobile, p_product_type: args.product_type,
      p_product_id: args.product_id, p_method: args.method, p_transaction_id: args.transaction_id, p_sender_number: args.sender_number || null,
    });
  },

  async submitContact(args) {
    if (!IS_CONFIGURED) return true;
    return rpc('submit_contact', { p_name: args.name, p_email: args.email, p_mobile: args.mobile, p_message: args.message });
  },
};
