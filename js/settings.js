// Shared page setup: mobile menu, login link, and filling the header/footer
// with the values saved in Admin → Website Settings.
import { api } from './supabase.js';
import { IS_CONFIGURED } from './config.js';
import { $, $$, esc, safeUrl, waLink } from './utils.js';

const CACHE_KEY = 'aca-settings-v1';
const CACHE_MS = 10 * 60 * 1000;
let settingsPromise;

export function getSettings() {
  if (settingsPromise) return settingsPromise;
  settingsPromise = (async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.t < CACHE_MS && IS_CONFIGURED === cached.live) return cached.data;
    } catch { /* storage blocked */ }
    try {
      const data = await api.settings();
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), live: IS_CONFIGURED, data })); } catch { /* ignore */ }
      return data;
    } catch (e) {
      console.warn('Settings could not be loaded', e);
      return {};
    }
  })();
  return settingsPromise;
}

export function clearSettingsCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

function hrefFor(kind, value) {
  if (!value) return '';
  switch (kind) {
    case 'tel': return 'tel:' + String(value).replace(/[^\d+]/g, '');
    case 'mailto': return 'mailto:' + value;
    case 'wa': return waLink(value);
    default: return safeUrl(value, '');
  }
}

// Fill any element marked with data-set / data-set-href / data-show-if
export function applySettings(s, root = document) {
  $$('[data-set]', root).forEach((el) => { const v = s[el.dataset.set]; if (v) el.textContent = v; });
  $$('[data-set-href]', root).forEach((el) => {
    const [kind, key] = el.dataset.setHref.split(':');
    const href = hrefFor(kind, s[key]);
    if (href) el.setAttribute('href', href);
  });
  $$('[data-show-if]', root).forEach((el) => { el.hidden = !s[el.dataset.showIf]; });
}

function setupNav() {
  const btn = $('.nav-toggle');
  const nav = $('#main-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('use')?.setAttribute('href', '/assets/icons/sprite.svg#i-' + (open ? 'x' : 'menu'));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) btn.click(); });
  }
  // Show "Dashboard" instead of "Login" when a student is signed in on this browser
  try {
    if (localStorage.getItem('aca-student-auth') && localStorage.getItem('aca-student-name')) {
      $$('.nav-login').forEach((a) => { a.textContent = 'Dashboard'; a.href = '/dashboard'; });
    }
  } catch { /* ignore */ }
}

export async function initLayout() {
  setupNav();
  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
  if (!IS_CONFIGURED && !$('.demo-note')) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="demo-note">Demo mode — sample content. Connect Supabase in <b>js/config.js</b> (see README).</div>');
  }
  const s = await getSettings();
  applySettings(s);

  const ann = $('#announce');
  if (ann && s.announcement) { ann.innerHTML = esc(s.announcement) + ' — <a href="/courses">বিস্তারিত দেখুন</a>'; ann.hidden = false; }

  if (s.logo_url) {
    $$('.brand').forEach((b) => {
      b.classList.add('custom-logo');
      b.innerHTML = `<img src="${esc(safeUrl(s.logo_url))}" alt="${esc(s.site_name || 'Accounting Career Academy')}" height="48">`;
    });
  }
  if (s.favicon_url) $$('link[rel="icon"]').forEach((l) => l.setAttribute('href', safeUrl(s.favicon_url)));

  // Social links in footer / contact: hide ones that are not configured
  $$('[data-social]').forEach((a) => {
    const key = a.dataset.social;
    const href = key === 'whatsapp' ? (s.whatsapp ? waLink(s.whatsapp) : '') : safeUrl(s[key], '');
    if (href) a.href = href; else a.hidden = true;
  });
  const wa = $('.wa-float');
  if (wa) { if (s.whatsapp) { wa.href = waLink(s.whatsapp, 'আসসালামু আলাইকুম, আমি কোর্স সম্পর্কে জানতে চাই।'); wa.hidden = false; } }
  return s;
}
