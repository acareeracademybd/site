// Small shared helpers (no libraries)
import { CONFIG } from './config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Escape text before putting it into HTML (XSS protection)
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Only allow safe link/image targets (blocks javascript: etc.)
export function safeUrl(url, fallback = '#') {
  const u = String(url ?? '').trim();
  if (!u) return fallback;
  if (/^(https?:\/\/|\/(?!\/)|mailto:|tel:|#)/i.test(u)) return u;
  return fallback;
}

export function icon(name, cls = 'ico') {
  return `<svg class="${cls}" aria-hidden="true"><use href="/assets/icons/sprite.svg#i-${name}"></use></svg>`;
}

export function money(n) {
  const v = Number(n || 0);
  if (!v) return 'Free';
  return CONFIG.CURRENCY + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function priceHtml(price, oldPrice) {
  const p = Number(price || 0);
  const o = Number(oldPrice || 0);
  return `<div class="price">${p ? `<b>${money(p)}</b>` : '<b class="free">Free</b>'}${o > p ? `<s>${money(o)}</s>` : ''}</div>`;
}

export function fmtDate(d, withTime = false) {
  if (!d) return '';
  const date = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(date)) return String(d);
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', opts);
}

// "one item per line" text → array
export const lines = (text) => String(text ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function slugify(text) {
  const s = String(text || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'item-' + Math.random().toString(36).slice(2, 8);
}

export function param(name) {
  return new URLSearchParams(location.search).get(name);
}

// Slug from pretty URL (/course/my-course) or ?slug=
export function slugFromUrl(prefix) {
  const q = param('slug');
  if (q) return q;
  const m = location.pathname.match(new RegExp('^/' + prefix + '/([a-z0-9-]+)/?$'));
  return m ? m[1] : null;
}

export function setMeta(title, description, { canonical = false } = {}) {
  if (title) {
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  }
  if (description) {
    const d = String(description).slice(0, 160);
    document.querySelector('meta[name="description"]')?.setAttribute('content', d);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', d);
  }
  if (canonical) {
    const base = CONFIG.SITE_URL.includes('your-domain') ? location.origin : CONFIG.SITE_URL.replace(/\/$/, '');
    const href = base + location.pathname;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = href;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', href);
  }
}

// Very small, SAFE formatter for blog posts & descriptions.
// Supports: blank line = new paragraph, "## " heading, "### " sub-heading,
// "- " bullet list, "1. " numbered list, "> " quote, **bold**, *italic*, [text](https://link)
export function richText(src) {
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = [];
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>` + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + `</${list.tag}>`); list = null; } };
  for (const raw of esc(src).replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{2,3})\s+(.+)$/))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = line.match(/^[-*•]\s+(.+)$/))) { flushPara(); if (list?.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\d+[.)]\s+(.+)$/))) { flushPara(); if (list?.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^&gt;\s?(.+)$/))) { flushPara(); flushList(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

// ---------- Video helpers ----------
export function youtubeId(url) {
  const u = String(url || '');
  const m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Returns { kind: 'iframe' | 'video', src } or null
export function videoSource(url, autoplay = true) {
  const u = String(url || '').trim();
  if (!u) return null;
  const yt = youtubeId(u);
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}` };
  let m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}${autoplay ? '?autoplay=1' : ''}` };
  m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  if (m) return { kind: 'iframe', src: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(u)) return { kind: 'video', src: u };
  return null;
}

export function videoEmbedHtml(url, title = 'Video', autoplay = true) {
  const v = videoSource(url, autoplay);
  if (!v) return '';
  if (v.kind === 'video') return `<video src="${esc(v.src)}" controls controlsList="nodownload" playsinline ${autoplay ? 'autoplay' : ''}></video>`;
  return `<iframe src="${esc(v.src)}" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

// Lightweight YouTube: show a thumbnail; load the real player only on click
export function mountLiteVideo(container, url, title, fallbackImg = '/assets/images/demo/demo-video.svg') {
  const id = youtubeId(url);
  const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : fallbackImg;
  container.innerHTML = `<button type="button" class="video-lite" aria-label="Play: ${esc(title)}">
      <img src="${esc(thumb)}" alt="${esc(title)}" loading="lazy" width="640" height="360"><span class="play" aria-hidden="true"></span></button>`;
  container.querySelector('button').addEventListener('click', () => {
    const html = videoEmbedHtml(url, title, true);
    if (!html) { toast('Video coming soon. Please check our YouTube channel.'); return; }
    container.innerHTML = html.replace('<iframe ', '<iframe class="video-frame" ').replace('<video ', '<video class="video-frame" ');
  }, { once: false });
}

export function openVideoModal(url, title = 'Preview') {
  const html = videoEmbedHtml(url, title, true);
  if (!html) { toast('Preview video is not available yet.'); return; }
  let dlg = document.getElementById('video-modal');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'video-modal';
    dlg.className = 'modal';
    dlg.addEventListener('close', () => { dlg.innerHTML = ''; });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
  }
  dlg.innerHTML = `<button class="modal-close" type="button" aria-label="Close">×</button>` +
    html.replace('<iframe ', '<iframe class="video-frame" style="border-radius:0" ').replace('<video ', '<video class="video-frame" style="border-radius:0" ');
  dlg.querySelector('.modal-close').onclick = () => dlg.close();
  dlg.showModal();
}

// ---------- UI feedback ----------
let toastTimer;
export function toast(message, type = 'info', ms = 3500) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

export async function copyText(text, okMsg = 'Copied!') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { prompt('Copy this:', text); }
}

// WhatsApp link: number like 8801XXXXXXXXX (digits only, with country code)
export function waLink(number, text = '') {
  let n = String(number || '').replace(/\D/g, '');
  if (n.startsWith('01')) n = '88' + n;
  return `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

export function emptyState(message, iconName = 'info') {
  return `<div class="empty">${icon(iconName)}<p class="mb-0">${esc(message)}</p></div>`;
}

export function errorText(err) {
  const msg = err?.message || String(err || 'Something went wrong');
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Network problem. Please check your internet connection and try again.';
  return msg;
}
