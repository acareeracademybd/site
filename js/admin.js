// Admin panel core: login check, layout, forms, tables, uploads.
// Security note: every admin action is ALSO checked by the database
// (is_admin() in Row Level Security), so hiding this page is not the only protection.
import { getClient } from './supabase.js';
import { IS_CONFIGURED, CONFIG } from './config.js';
import { $, $$, esc, icon, toast, copyText, waLink, safeUrl, errorText, fmtDate, money, slugify } from './utils.js';

export { $, $$, esc, icon, toast, copyText, waLink, safeUrl, errorText, fmtDate, money };

const NAV = [
  ['index', '/admin/', 'grid', 'Dashboard'],
  ['courses', '/admin/courses', 'video', 'Courses'],
  ['lessons', '/admin/lessons', 'list', 'Modules / Lessons'],
  ['students', '/admin/students', 'users', 'Students'],
  ['payments', '/admin/payments', 'card', 'Payments'],
  ['codes', '/admin/access-codes', 'key', 'Access Codes'],
  ['ebooks', '/admin/ebooks', 'book', 'E-books'],
  ['blog', '/admin/blog', 'file', 'Blog'],
  ['testimonials', '/admin/testimonials', 'chat', 'Testimonials'],
  ['messages', '/admin/messages', 'mail', 'Messages'],
  'sep',
  ['settings', '/admin/settings', 'sliders', 'Website Settings'],
  ['youtube', '/admin/settings#youtube', 'youtube', 'YouTube Settings'],
  ['payment-settings', '/admin/settings#payment', 'card', 'Payment Settings'],
  ['trainer', '/admin/settings#trainer', 'user', 'Profile / Trainer'],
];

export let sb = null;

// Throw on Supabase error, return data otherwise
export function must(res) {
  if (res.error) throw res.error;
  return res.data;
}

function friendly(err) {
  const m = err?.message || String(err);
  if (/duplicate key.*slug/i.test(m)) return 'This URL name (slug) is already used. Please change it.';
  if (/students_email_key|duplicate key.*email/i.test(m)) return 'A student with this email already exists.';
  if (/duplicate key/i.test(m)) return 'This item already exists.';
  if (/violates check constraint.*students_email/i.test(m)) return 'Please enter a valid email address.';
  if (/violates check constraint.*slug/i.test(m)) return 'URL name (slug) may contain only small English letters, numbers and dashes.';
  if (/violates foreign key/i.test(m)) return 'This item is used somewhere else and cannot be changed/deleted.';
  if (/JWT|not authorized|permission denied|row-level security/i.test(m)) return 'Permission denied. Please log in again as admin.';
  return errorText(err);
}
export { friendly };

export async function adminInit(active, title) {
  document.title = `${title} — Admin — Accounting Career Academy`;
  const root = document.getElementById('admin-root');
  if (!IS_CONFIGURED) {
    root.innerHTML = `<div class="admin-login"><div class="card auth-card"><h1>Setup needed</h1><p class="muted">The Admin Panel works after you connect Supabase in <b>js/config.js</b>. Follow README → Steps 3–8.</p><a class="btn btn-primary" href="/">View website</a></div></div>`;
    return new Promise(() => {}); // stop here (nothing else to do)
  }
  sb = await getClient('admin');
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace('/admin/login'); return new Promise(() => {}); }
  const { data: ok, error } = await sb.rpc('is_admin');
  if (error || !ok) {
    await sb.auth.signOut();
    location.replace('/admin/login?denied=1');
    return new Promise(() => {});
  }

  root.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-side" id="admin-side">
      <a class="brand" href="/admin/"><img src="/assets/logo/logo-mark.svg" alt="" width="38" height="38"><span class="brand-text"><b>ACCOUNTING CAREER</b><span>ADMIN PANEL</span></span></a>
      <ul class="admin-nav">
        ${NAV.map((n) => n === 'sep' ? '<li class="sep" role="separator"></li>' : `<li><a href="${n[1]}"${n[0] === active ? ' aria-current="page"' : ''} data-nav="${n[0]}">${icon(n[2])}<span>${n[3]}</span></a></li>`).join('')}
        <li class="sep" role="separator"></li>
        <li><a href="/" target="_blank" rel="noopener">${icon('external')}<span>View Website</span></a></li>
        <li><button type="button" id="admin-logout">${icon('logout')}<span>Logout</span></button></li>
      </ul>
    </aside>
    <div class="admin-main">
      <header class="admin-top">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="icon-btn admin-menu-btn" type="button" id="admin-menu" aria-label="Menu">${icon('menu')}</button>
          <h1>${esc(title)}</h1>
        </div>
        <div class="who">${icon('user')} ${esc(session.user.email || '')}</div>
      </header>
      <div class="admin-content" id="admin-content"></div>
    </div>
  </div>`;

  $('#admin-logout').addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/admin/login'; });
  $('#admin-menu').addEventListener('click', () => $('#admin-side').classList.toggle('open'));
  document.addEventListener('click', (e) => {
    const side = $('#admin-side');
    if (side.classList.contains('open') && !side.contains(e.target) && !e.target.closest('#admin-menu')) side.classList.remove('open');
  });
  // Settings sub-links (same page, different section)
  if (active === 'settings') {
    const mark = () => {
      const h = location.hash.replace('#', '');
      const map = { youtube: 'youtube', payment: 'payment-settings', trainer: 'trainer' };
      $$('.admin-nav a[data-nav]').forEach((a) => a.removeAttribute('aria-current'));
      $(`.admin-nav a[data-nav="${map[h] || 'settings'}"]`)?.setAttribute('aria-current', 'page');
    };
    window.addEventListener('hashchange', mark); mark();
  }
  // Pending payment badge
  sb.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => {
    if (count) $('.admin-nav a[data-nav="payments"]')?.insertAdjacentHTML('beforeend', `<span class="count">${count}</span>`);
  });
  sb.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false).then(({ count }) => {
    if (count) $('.admin-nav a[data-nav="messages"]')?.insertAdjacentHTML('beforeend', `<span class="count">${count}</span>`);
  });
  return { sb, content: $('#admin-content'), user: session.user };
}

// ------------------------------------------------------------------
// Uploads
// ------------------------------------------------------------------
const cleanName = (name) => String(name).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').slice(-80);

export async function uploadPublic(file, folder = 'uploads') {
  if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large. Please use an image under 5 MB (tip: compress it at squoosh.app).');
  const path = `${folder}/${Date.now()}-${cleanName(file.name)}`;
  must(await sb.storage.from('public-media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type }));
  return sb.storage.from('public-media').getPublicUrl(path).data.publicUrl;
}

export async function uploadPrivate(bucket, folder, file) {
  if (file.size > 50 * 1024 * 1024) throw new Error('File is larger than 50 MB (Supabase free limit).');
  const path = `${folder}/${Date.now()}-${cleanName(file.name)}`;
  must(await sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' }));
  return path;
}

// ------------------------------------------------------------------
// Form dialog built from a simple field list
//   field: { name, label, type, options, required, hint, placeholder, full, rows, folder, accept }
//   types: text email url number date datetime textarea lines rich select checkbox image hidden
// ------------------------------------------------------------------
export function fieldHtml(f, v) {
  const id = 'f-' + f.name;
  const req = f.required ? ' required' : '';
  const val = v ?? f.default ?? '';
  const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
  const full = f.full || ['textarea', 'lines', 'rich', 'image'].includes(f.type) ? ' full' : '';
  const label = `<label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>`;
  switch (f.type) {
    case 'hidden': return `<input type="hidden" name="${f.name}" value="${esc(val)}">`;
    case 'textarea': case 'lines': case 'rich':
      return `<div class="field${full}">${label}<textarea class="textarea" id="${id}" name="${f.name}" rows="${f.rows || (f.type === 'rich' ? 12 : 4)}"${req} placeholder="${esc(f.placeholder || (f.type === 'lines' ? 'One item per line' : ''))}">${esc(val)}</textarea>${hint}
        ${f.type === 'lines' && !f.hint ? '<span class="hint">প্রতি লাইনে একটি আইটেম লিখুন।</span>' : ''}
        ${f.type === 'rich' ? '<span class="hint">Formatting: <b>## Heading</b>, <b>- bullet</b>, <b>1. numbered</b>, <b>**bold**</b>, <b>[link text](https://...)</b>. Leave an empty line between paragraphs.</span>' : ''}</div>`;
    case 'select':
      return `<div class="field${full}">${label}<select class="select" id="${id}" name="${f.name}"${req}>${f.options.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`).join('')}</select>${hint}</div>`;
    case 'checkbox':
      return `<div class="field${full}"><label class="check"><input type="checkbox" id="${id}" name="${f.name}"${val === true || val === 'true' ? ' checked' : ''}> ${esc(f.label)}</label>${hint}</div>`;
    case 'image':
      return `<div class="field full">${label}<div class="img-field">
          <img src="${esc(safeUrl(val, '/assets/logo/logo-mark.svg'))}" alt="" data-preview-for="${id}">
          <div class="grow">
            <input class="input" id="${id}" name="${f.name}" value="${esc(val)}" placeholder="Upload an image or paste an image link">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="btn btn-light btn-sm file-btn">${icon('image')} <span class="lbl">Upload image</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload-for="${id}" data-folder="${esc(f.folder || 'uploads')}"></span>
              <button type="button" class="btn btn-ghost btn-sm" data-clear-for="${id}">Remove</button>
            </div>
          </div></div>${hint || '<span class="hint">Tip: use JPG/WebP under 300 KB for a fast website.</span>'}</div>`;
    case 'datetime': {
      const local = val ? new Date(val).toISOString().slice(0, 10) : '';
      return `<div class="field${full}">${label}<input class="input" type="date" id="${id}" name="${f.name}" value="${local}"${req}>${hint}</div>`;
    }
    default: {
      const type = ['email', 'url', 'number', 'date', 'password', 'tel'].includes(f.type) ? f.type : 'text';
      return `<div class="field${full}">${label}<input class="input" type="${type}" id="${id}" name="${f.name}" value="${esc(val)}"${req}${f.type === 'number' ? ' step="any" min="0"' : ''} placeholder="${esc(f.placeholder || '')}" ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}>${hint}</div>`;
    }
  }
}

export function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === 'checkbox') out[f.name] = el.checked;
    else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
    else if (f.type === 'datetime') out[f.name] = el.value ? new Date(el.value + 'T23:59:59').toISOString() : null;
    else if (f.type === 'date') out[f.name] = el.value || null;
    else out[f.name] = el.value.trim() === '' ? (f.emptyAs ?? null) : el.value.trim();
  }
  return out;
}

// Activate image upload / preview controls inside a container
export function wireFields(dlg) {
  $$('[data-upload-for]', dlg).forEach((inp) => inp.addEventListener('change', async () => {
    const file = inp.files[0];
    if (!file) return;
    const target = dlg.querySelector('#' + inp.dataset.uploadFor);
    const btn = inp.parentElement;
    const lbl = btn.querySelector('.lbl');
    lbl.textContent = 'Uploading…';
    try {
      target.value = await uploadPublic(file, inp.dataset.folder);
      dlg.querySelector(`[data-preview-for="${inp.dataset.uploadFor}"]`).src = target.value;
      toast('Image uploaded');
    } catch (err) { toast(friendly(err), 'error', 6000); }
    lbl.textContent = 'Upload image';
    inp.value = '';
  }));
  $$('[data-clear-for]', dlg).forEach((b) => b.addEventListener('click', () => {
    dlg.querySelector('#' + b.dataset.clearFor).value = '';
    dlg.querySelector(`[data-preview-for="${b.dataset.clearFor}"]`).src = '/assets/logo/logo-mark.svg';
  }));
  $$('input[id][name]', dlg).forEach((inp) => {
    const pv = dlg.querySelector(`[data-preview-for="${inp.id}"]`);
    if (pv) inp.addEventListener('change', () => { pv.src = safeUrl(inp.value, '/assets/logo/logo-mark.svg'); });
  });

}

export function openForm({ title, fields, values = {}, submitLabel = 'Save', onSubmit, wide = false, intro = '' }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'admin-modal' + (wide ? ' wide' : '');
  dlg.innerHTML = `<form novalidate>
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">${intro ? `<div class="full">${intro}</div>` : ''}${fields.map((f) => fieldHtml(f, values[f.name])).join('')}<div class="full" data-alert></div></div>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">${esc(submitLabel)}</button></div>
  </form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');
  const alertBox = dlg.querySelector('[data-alert]');
  const close = () => { dlg.close(); dlg.remove(); };
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', close));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

  wireFields(dlg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && f.type !== 'checkbox' && !String(form.elements[f.name]?.value || '').trim());
    if (missing.length) { alertBox.innerHTML = `<div class="alert alert-error">Please fill in: ${missing.map((f) => esc(f.label)).join(', ')}</div>`; return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Saving…';
    try {
      await onSubmit(readForm(form, fields), dlg);
      close();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${esc(friendly(err))}</div>`;
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });
  dlg.showModal();
  return dlg;
}

// Simple information dialog (HTML content)
export function openInfo(title, html, { wide = false } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'admin-modal' + (wide ? ' wide' : '');
  dlg.innerHTML = `<div style="display:flex;flex-direction:column;max-height:calc(100vh - 30px)">
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body" style="display:block">${html}</div>
    <div class="modal-foot"><button type="button" class="btn btn-primary" data-close>Close</button></div></div>`;
  document.body.appendChild(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', close));
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  return dlg;
}

// ------------------------------------------------------------------
// Show a newly generated Access Code with copy / WhatsApp / email buttons
// ------------------------------------------------------------------
export function showAccessCode({ code, name, email, mobile, product_title: product, new_code: isNew = true, code_hint: hint }) {
  const loginUrl = location.origin + '/login?email=' + encodeURIComponent(email || '');
  const msg = code
    ? `আসসালামু আলাইকুম ${name || ''},\nআপনার পেমেন্ট নিশ্চিত হয়েছে${product ? ` (${product})` : ''}। ✅\n\nLogin: ${loginUrl}\nEmail: ${email}\nAccess Code: ${code}\n\nলগইন করে Dashboard থেকে আপনার কোর্স/ই-বুক দেখুন।\n— Accounting Career Academy`
    : `আসসালামু আলাইকুম ${name || ''},\nআপনার পেমেন্ট নিশ্চিত হয়েছে${product ? ` (${product})` : ''}। ✅\nআপনার আগের Access Code দিয়েই লগইন করে নতুন কোর্স/ই-বুক দেখতে পারবেন।\n\nLogin: ${loginUrl}\n— Accounting Career Academy`;
  const html = code ? `
      <p>Access Code for <b>${esc(name || email)}</b> (${esc(email)}):</p>
      <div class="code-box" id="code-box">${esc(code)}</div>
      <div class="alert alert-warning mt-2">⚠️ এই কোডটি এখনই কপি করে শিক্ষার্থীকে পাঠান। নিরাপত্তার জন্য কোডটি পরে আর দেখা যাবে না (প্রয়োজনে নতুন কোড Generate করতে পারবেন)।</div>`
    : `<div class="alert alert-info">✅ Approved. <b>${esc(name || email)}</b> already has an active Access Code (ending <b>${esc(hint || '')}</b>) — the new item is added to the same account. If the student lost the code, open <b>Students</b> and click <b>Generate new code</b>.</div>`;
  const dlg = openInfo(code ? 'Access Code generated' : 'Payment approved', `${html}
    <div class="btn-row mt-3">
      ${code ? `<button type="button" class="btn btn-primary" data-copy-code>${icon('copy')} Copy code</button>` : ''}
      <button type="button" class="btn btn-light" data-copy-msg>${icon('copy')} Copy full message</button>
      ${mobile ? `<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="${esc(waLink(mobile, msg))}">${icon('whatsapp')} Send on WhatsApp</a>` : ''}
      ${email ? `<a class="btn btn-ghost" href="mailto:${esc(email)}?subject=${encodeURIComponent('Your Access Code — Accounting Career Academy')}&body=${encodeURIComponent(msg)}">${icon('mail')} Email</a>` : ''}
    </div>`);
  dlg.querySelector('[data-copy-code]')?.addEventListener('click', () => copyText(code, 'Code copied'));
  dlg.querySelector('[data-copy-msg]').addEventListener('click', () => copyText(msg, 'Message copied'));
}

// ------------------------------------------------------------------
// Tables
// ------------------------------------------------------------------
export function table(columns, rows, { empty = 'Nothing here yet.', actions } = {}) {
  if (!rows.length) return `<div class="empty">${icon('info')}<p class="mb-0">${esc(empty)}</p></div>`;
  return `<div class="table-wrap"><table class="table">
    <thead><tr>${columns.map((c) => `<th>${esc(c[0])}</th>`).join('')}${actions ? '<th class="actions-cell">Actions</th>' : ''}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr data-row="${i}">${columns.map((c) => `<td>${c[1](r)}</td>`).join('')}${actions ? `<td class="actions-cell"><div class="actions">${actions(r, i)}</div></td>` : ''}</tr>`).join('')}</tbody>
  </table></div>`;
}

export const btn = (action, label, ico, cls = 'btn-ghost') => `<button type="button" class="btn ${cls} btn-sm" data-action="${action}">${ico ? icon(ico) : ''}${esc(label)}</button>`;
export const iconBtn = (action, ico, label, danger = false, disabled = false) =>
  `<button type="button" class="icon-btn${danger ? ' danger' : ''}" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}"${disabled ? ' disabled' : ''}>${icon(ico)}</button>`;

// Delegate [data-action] clicks inside a container to handlers: { edit(row, index, button) {...} }
export function onActions(container, rowsRef, handlers) {
  container.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || !container.contains(b)) return;
    const tr = b.closest('[data-row]');
    const i = tr ? Number(tr.dataset.row) : -1;
    const fn = handlers[b.dataset.action];
    if (!fn) return;
    b.disabled = true;
    try { await fn(i >= 0 ? rowsRef(b)[i] : null, i, b); }
    catch (err) { toast(friendly(err), 'error', 6000); }
    finally { if (document.body.contains(b)) b.disabled = false; }
  });
}

export const statusBadge = (s) => ({
  published: '<span class="badge badge-success">Published</span>',
  draft: '<span class="badge badge-muted">Draft</span>',
  active: '<span class="badge badge-success">Active</span>',
  inactive: '<span class="badge badge-muted">Inactive</span>',
  pending: '<span class="badge badge-warning">Pending</span>',
  approved: '<span class="badge badge-success">Approved</span>',
  rejected: '<span class="badge badge-danger">Rejected</span>',
}[s] || `<span class="badge">${esc(s)}</span>`);

export const PUBLISH_OPTIONS = [['published', 'Published (visible on website)'], ['draft', 'Draft (hidden)']];

// Move an item up/down by swapping sort_order values
export async function reorder(tableName, list, index, dir) {
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const normalized = list.map((item, k) => ({ id: item.id, sort_order: k + 1 }));
  [normalized[index].sort_order, normalized[j].sort_order] = [normalized[j].sort_order, normalized[index].sort_order];
  await Promise.all(normalized.map((n) => sb.from(tableName).update({ sort_order: n.sort_order }).eq('id', n.id).then(must)));
}

// Clean a typed slug, or build one from the title
export function slugOrGenerate(slug, title) {
  const s = String(slug || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || slugify(title);
}

export const siteUrl = () => (CONFIG.SITE_URL.includes('your-domain') ? location.origin : CONFIG.SITE_URL).replace(/\/$/, '');
