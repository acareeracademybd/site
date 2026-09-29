// Admin → Website Settings (general, homepage, contact, YouTube, payment, trainer, about, why-learn items, SEO)
import { adminInit, must, esc, icon, fieldHtml, readForm, wireFields, toast, table, iconBtn, onActions, openForm, reorder, statusBadge, PUBLISH_OPTIONS, siteUrl, $ } from '../admin.js';
import { FEATURE_ICONS } from '../ui.js';

const { sb, content } = await adminInit('settings', 'Website Settings');

const SECTIONS = [
  ['general', 'General', [
    { name: 'site_name', label: 'Website name' },
    { name: 'tagline', label: 'Tagline' },
    { name: 'logo_url', label: 'Logo (optional — replaces the default logo in the header; wide PNG/WebP, transparent background)', type: 'image', folder: 'branding' },
    { name: 'favicon_url', label: 'Favicon (optional — square PNG 512×512)', type: 'image', folder: 'branding' },
    { name: 'announcement', label: 'Announcement bar (top of every page — leave empty to hide)', full: true },
    { name: 'footer_text', label: 'Footer text', type: 'textarea', rows: 2 },
  ]],
  ['homepage', 'Homepage', [
    { name: 'hero_title', label: 'Hero title', full: true },
    { name: 'hero_subtitle', label: 'Hero subtitle', type: 'textarea', rows: 3 },
    { name: 'featured_course_slug', label: 'Featured course', type: 'select', options: [] },
    { name: 'stat_students', label: 'Statistic: Students trained', placeholder: '40+' },
    { name: 'stat_courses', label: 'Statistic: Courses', placeholder: '3+' },
    { name: 'stat_ebooks', label: 'Statistic: E-books', placeholder: '3+' },
    { name: 'stat_years', label: 'Statistic: Years of experience', placeholder: '10+' },
  ]],
  ['contact', 'Contact & Social', [
    { name: 'phone', label: 'Phone', placeholder: '+880 17XX-XXXXXX' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'whatsapp', label: 'WhatsApp number (with country code, digits only)', placeholder: '8801712345678', hint: 'Payment confirmations are sent to this number. Example: 8801712345678' },
    { name: 'facebook_url', label: 'Facebook page link', type: 'url', placeholder: 'https://facebook.com/yourpage' },
    { name: 'messenger_url', label: 'Messenger link (optional)', type: 'url', placeholder: 'https://m.me/yourpage' },
    { name: 'address', label: 'Address' },
    { name: 'office_hours', label: 'Office hours' },
  ]],
  ['youtube', 'YouTube', [
    { name: 'youtube_video_url', label: 'Free / demo class video (YouTube link)', full: true, placeholder: 'https://www.youtube.com/watch?v=...', hint: 'The homepage shows only a thumbnail; the player loads when a visitor clicks (keeps the site fast).' },
    { name: 'youtube_channel_url', label: 'YouTube channel link', type: 'url', full: true, placeholder: 'https://www.youtube.com/@yourchannel' },
    { name: 'youtube_section_text', label: 'Text beside the video', type: 'textarea', rows: 2 },
  ]],
  ['payment', 'Payment', [
    { name: 'bkash_number', label: 'bKash number', placeholder: '01XXXXXXXXX', hint: 'Leave empty to hide bKash.' },
    { name: 'bkash_type', label: 'bKash account type', type: 'select', options: [['Personal', 'Personal (Send Money)'], ['Agent', 'Agent (Cash Out)'], ['Merchant', 'Merchant (Payment)']] },
    { name: 'nagad_number', label: 'Nagad number', placeholder: '01XXXXXXXXX', hint: 'Leave empty to hide Nagad.' },
    { name: 'nagad_type', label: 'Nagad account type', type: 'select', options: [['Personal', 'Personal (Send Money)'], ['Agent', 'Agent (Cash Out)'], ['Merchant', 'Merchant (Payment)']] },
    { name: 'payment_note', label: 'Payment instructions (shown on checkout)', type: 'textarea', rows: 3 },
  ]],
  ['trainer', 'Profile / Trainer', [
    { name: 'trainer_name', label: 'Trainer name' },
    { name: 'trainer_title', label: 'Title / designation' },
    { name: 'trainer_photo_url', label: 'Trainer photo (square)', type: 'image', folder: 'trainer' },
    { name: 'trainer_bio', label: 'Short bio', type: 'rich', rows: 4 },
    { name: 'trainer_experience', label: 'Professional experience', type: 'lines' },
    { name: 'trainer_education', label: 'Educational qualification', type: 'lines' },
    { name: 'trainer_accounting_exp', label: 'Accounting experience', type: 'lines' },
    { name: 'trainer_training_exp', label: 'Training experience', type: 'lines' },
    { name: 'trainer_achievements', label: 'Achievements', type: 'lines' },
  ]],
  ['about', 'About Academy', [
    { name: 'academy_mission', label: 'Mission', type: 'textarea', rows: 2 },
    { name: 'academy_vision', label: 'Vision', type: 'textarea', rows: 2 },
    { name: 'academy_philosophy', label: 'Learning philosophy', type: 'textarea', rows: 3 },
    { name: 'academy_achievements', label: 'Student achievements', type: 'lines' },
  ]],
];
const ALL_FIELDS = SECTIONS.flatMap((s) => s[2]);

let values = {};
let features = [];

async function load() {
  const [rows, courses] = await Promise.all([
    sb.from('website_settings').select('key,value').then(must),
    sb.from('courses').select('slug,title').order('sort_order').then(must),
  ]);
  values = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  ALL_FIELDS.find((f) => f.name === 'featured_course_slug').options = [['', '— automatic (course marked Featured) —'], ...courses.map((c) => [c.slug, c.title])];

  content.innerHTML = `
    <nav class="settings-nav">${SECTIONS.map(([id, t]) => `<a class="btn btn-ghost btn-sm" href="#${id}">${esc(t)}</a>`).join('')}
      <a class="btn btn-ghost btn-sm" href="#features">Why Learn With Us</a><a class="btn btn-ghost btn-sm" href="#seo">SEO</a></nav>
    <form id="settings-form" novalidate>
      ${SECTIONS.map(([id, t, fields]) => `
        <section class="panel" id="${id}" style="scroll-margin-top:12px">
          <div class="panel-head"><h2>${esc(t)}</h2></div>
          <div class="panel-body settings-grid">${fields.map((f) => fieldHtml(f, values[f.name])).join('')}</div>
        </section>`).join('')}
      <div class="sticky-save"><span class="small muted" id="save-status" style="margin-right:auto;align-self:center"></span><button class="btn btn-primary" type="submit">${icon('check')} Save settings</button></div>
    </form>
    <section class="panel" id="features" style="scroll-margin-top:12px">
      <div class="panel-head"><h2>Why Learn With Us (homepage items)</h2><button type="button" class="btn btn-light btn-sm" data-action="f-add">${icon('plus')} Add item</button></div>
      <div class="panel-body" id="features-box"></div>
    </section>
    <section class="panel" id="seo" style="scroll-margin-top:12px">
      <div class="panel-head"><h2>SEO — sitemap.xml</h2></div>
      <div class="panel-body">
        <p class="small">After adding courses, e-books or blog posts, download a fresh <b>sitemap.xml</b> and replace the file in your GitHub repository (README → "Updating the sitemap"). Then submit <code>${esc(siteUrl())}/sitemap.xml</code> in Google Search Console.</p>
        <button type="button" class="btn btn-light" id="sitemap-btn">${icon('download')} Download sitemap.xml</button>
      </div>
    </section>`;
  wireFields(content);
  $('#settings-form').addEventListener('submit', save);
  $('#settings-form').addEventListener('input', () => { $('#save-status').textContent = 'Unsaved changes'; });
  $('#sitemap-btn').addEventListener('click', sitemap);
  await loadFeatures();
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

async function save(e) {
  e.preventDefault();
  const form = $('#settings-form');
  const v = readForm(form, ALL_FIELDS);
  if (v.whatsapp) v.whatsapp = v.whatsapp.replace(/\D/g, '').replace(/^01/, '8801');
  const changed = Object.entries(v).filter(([k, val]) => (val ?? '') !== (values[k] ?? '')).map(([key, value]) => ({ key, value: value ?? '', updated_at: new Date().toISOString() }));
  const btn = form.querySelector('[type="submit"]');
  if (!changed.length) { toast('No changes to save'); return; }
  btn.disabled = true;
  try {
    must(await sb.from('website_settings').upsert(changed, { onConflict: 'key' }));
    changed.forEach((c) => { values[c.key] = c.value; });
    if (v.whatsapp) form.elements.whatsapp.value = v.whatsapp;
    try { sessionStorage.removeItem('aca-settings-v1'); } catch { /* ignore */ }
    $('#save-status').textContent = `Saved ${changed.length} setting(s) ✓ — visitors see changes within ~10 minutes.`;
    toast('Settings saved');
  } catch (err) { toast(err.message, 'error', 6000); }
  btn.disabled = false;
}

// ---- Why-learn items ----
const featureFields = [
  { name: 'title', label: 'Title', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
  { name: 'icon', label: 'Icon', type: 'select', options: FEATURE_ICONS.map((i) => [i, i]) },
  { name: 'status', label: 'Status', type: 'select', options: PUBLISH_OPTIONS },
];

async function loadFeatures() {
  features = must(await sb.from('features').select('*').order('sort_order'));
  $('#features-box').innerHTML = table([
    ['Item', (f) => `<div style="display:flex;gap:10px;align-items:center"><span class="icon-btn" style="cursor:default">${icon(f.icon)}</span><div><b>${esc(f.title)}</b><small>${esc(f.description || '')}</small></div></div>`],
    ['Status', (f) => statusBadge(f.status)],
  ], features, {
    empty: 'No items yet.',
    actions: (f, i) => iconBtn('f-up', 'up', 'Move up', false, i === 0) + iconBtn('f-down', 'down', 'Move down', false, i === features.length - 1) + iconBtn('f-edit', 'edit', 'Edit') + iconBtn('f-del', 'trash', 'Delete', true),
  });
}

onActions(content, () => features, {
  'f-add': () => openForm({ title: 'Add item', fields: featureFields, values: { icon: 'check', status: 'published' }, onSubmit: async (v) => { must(await sb.from('features').insert({ ...v, sort_order: features.length + 1 })); await loadFeatures(); } }),
  'f-edit': (f) => openForm({ title: 'Edit item', fields: featureFields, values: f, onSubmit: async (v) => { must(await sb.from('features').update(v).eq('id', f.id)); await loadFeatures(); } }),
  'f-del': async (f) => { if (!confirm(`Delete "${f.title}"?`)) return; must(await sb.from('features').delete().eq('id', f.id)); await loadFeatures(); },
  'f-up': async (f, i) => { await reorder('features', features, i, -1); await loadFeatures(); },
  'f-down': async (f, i) => { await reorder('features', features, i, 1); await loadFeatures(); },
});

async function sitemap() {
  const base = siteUrl();
  const [courses, ebooks, posts] = await Promise.all([
    sb.from('courses').select('slug,updated_at').eq('status', 'published').then(must),
    sb.from('ebooks').select('slug,updated_at').eq('status', 'published').then(must),
    sb.from('blog_posts').select('slug,updated_at').eq('status', 'published').then(must),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ['/', today, '1.0'], ['/courses', today, '0.9'], ['/recorded-courses', today, '0.8'], ['/ebooks', today, '0.8'],
    ['/blog', today, '0.7'], ['/about', today, '0.6'], ['/contact', today, '0.6'],
    ...courses.map((c) => [`/course/${c.slug}`, c.updated_at.slice(0, 10), '0.9']),
    ...ebooks.map((b) => [`/ebook/${b.slug}`, b.updated_at.slice(0, 10), '0.8']),
    ...posts.map((p) => [`/blog/${p.slug}`, p.updated_at.slice(0, 10), '0.6']),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, p]) => `  <url><loc>${base}${u}</loc><lastmod>${d}</lastmod><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
  a.download = 'sitemap.xml';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('sitemap.xml downloaded');
}

await load();
