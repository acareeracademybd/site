// Admin → Certificates
//  • add one certificate, or paste a whole student list (from Excel) and import it
//  • preview / download, e-mail the certificate link to the student (Resend), resend, revoke
//  • settings: sender e-mail, LinkedIn organisation
import { adminInit, must, esc, icon, table, iconBtn, onActions, openForm, openInfo, toast, copyText, friendly, siteUrl, $ } from '../admin.js';
import { renderCertificate, canvasToPdf, canvasBlob, downloadBlob, safeFileName, formatDate } from '../certificate-render.js';

const { sb, content } = await adminInit('certificates', 'Certificates');

const SETTING_KEYS = ['cert_email_from', 'cert_reply_to', 'cert_copy_to', 'cert_site_url', 'cert_linkedin_org_name', 'cert_linkedin_org_id'];
const DEFAULT_FROM = 'Accounting Career Academy <certificates@accountingcareeracademy.com>';
const DEFAULTS_KEY = 'aca-cert-defaults';
const FIRST_DEFAULTS = {
  course_name: 'Practical Accounting Executive Course',
  duration: '8 sessions of 2:00 hours each.',
  course_area: 'Practical Accounting, Tally Prime & MS Excel for Accounting Professionals',
};

let rows = [];
let settings = {};
let query = '';
let filter = '';

// ---------- small helpers ----------
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const certErr = (e) => (/certificate_no|certificates_certificate/i.test(e?.message || '') ? new Error('This Certificate No. already exists. Please use a different number.') : e);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = () => String(settings.cert_site_url || siteUrl()).replace(/\/$/, '');
const certLink = (r) => `${site()}/certificate?id=${r.code}`;

function getDefaults() {
  try { return { ...FIRST_DEFAULTS, ...JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}') }; } catch { return { ...FIRST_DEFAULTS }; }
}
function saveDefaults(v) {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ course_name: v.course_name || '', duration: v.duration || '', course_area: v.course_area || '' }));
  } catch { /* storage may be blocked — not important */ }
}

const emailBadge = (r) => {
  if (r.status === 'revoked') return '<span class="badge badge-muted">Revoked</span>';
  switch (r.email_status) {
    case 'sent': return `<span class="badge badge-success">Sent</span>${r.email_sent_at ? `<small>${new Date(r.email_sent_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</small>` : ''}`;
    case 'queued': return '<span class="badge badge-warning">Sending…</span>';
    case 'failed': return `<span class="badge badge-danger">Failed</span><small>${esc((r.email_error || '').slice(0, 120))}</small>`;
    default: return '<span class="badge badge-muted">Not sent</span>';
  }
};

// ---------- load / render ----------
async function loadSettings() {
  const data = must(await sb.from('website_settings').select('key,value').in('key', SETTING_KEYS));
  settings = Object.fromEntries(data.map((s) => [s.key, s.value || '']));
}

async function load() {
  await sb.rpc('admin_cert_refresh_status').then(() => {}, () => {});
  [rows] = await Promise.all([
    sb.from('certificates').select('*').order('created_at', { ascending: false }).range(0, 4999).then(must),
    loadSettings(),
  ]);
  render();
}

const visible = () => rows.filter((r) =>
  (!filter || (filter === 'revoked' ? r.status === 'revoked' : r.status === 'valid' && (filter === 'unsent' ? ['pending', 'failed'].includes(r.email_status) : r.email_status === filter))) &&
  (!query || [r.name, r.email, r.certificate_no, r.batch, r.course_name].some((v) => String(v || '').toLowerCase().includes(query))));

const unsent = () => rows.filter((r) => r.status === 'valid' && ['pending', 'failed'].includes(r.email_status));

function render() {
  const list = visible();
  $('#count').textContent = `${list.length} of ${rows.length} certificates`;
  const n = unsent().length;
  const sendAll = $('#send-all');
  sendAll.innerHTML = `${icon('mail')} Send to all unsent (${n})`;
  sendAll.disabled = !n;
  $('#list').innerHTML = table([
    ['No.', (r) => `<b>${esc(r.certificate_no)}</b>`],
    ['Student', (r) => `<b>${esc(r.name)}</b><small>${esc(r.email)}</small>`],
    ['Batch', (r) => esc(r.batch || '—')],
    ['Course', (r) => `${esc(r.course_name)}<small>${esc(formatDate(r.completion_date))}</small>`],
    ['Email', emailBadge],
  ], list, {
    empty: rows.length ? 'No certificates match your search.' : 'No certificates yet. Click "Add Certificate" or "Import List".',
    actions: (r) => [
      iconBtn('preview', 'eye', 'Preview / Download'),
      r.status === 'valid' ? iconBtn('send', 'mail', r.email_status === 'sent' ? 'Send again' : 'Send email') : '',
      iconBtn('link', 'copy', 'Copy certificate link'),
      iconBtn('edit', 'edit', 'Edit'),
      iconBtn('toggle', r.status === 'valid' ? 'lock' : 'refresh', r.status === 'valid' ? 'Revoke (mark as invalid)' : 'Restore'),
      iconBtn('delete', 'trash', 'Delete', true),
    ].join(''),
  });
}

// ---------- sending ----------
// Resend allows ~2 requests per second, so we send one by one with a short pause.
let sending = false;
async function sendMany(list) {
  if (sending || !list.length) return;
  sending = true;
  let ok = 0; let bad = 0; let lastError = '';
  try {
    for (let i = 0; i < list.length; i++) {
      toast(`Sending ${i + 1} of ${list.length}…`, 'info', 1500);
      const res = must(await sb.rpc('admin_cert_send', { p_ids: [list[i].id] }));
      ok += res.queued || 0; bad += res.failed || 0; if (res.error) lastError = res.error;
      if (i < list.length - 1) await sleep(700);
    }
  } catch (e) { lastError = friendly(e); bad += 1; }
  sending = false;
  toast(`${ok} email(s) sent to Resend${bad ? `, ${bad} failed` : ''}.${lastError ? ' ' + lastError : ''}`, bad ? 'error' : 'success', bad ? 9000 : 4500);
  await load();
  // delivery answers arrive a few seconds later → refresh once more
  await sleep(4000);
  await load();
}

// ---------- add / edit ----------
function certFields(extra = []) {
  return [
    { name: 'certificate_no', label: 'Certificate No.', required: true, placeholder: '1057', hint: 'You type this manually. It must be unique.' },
    { name: 'name', label: 'Student name (as printed)', required: true },
    { name: 'email', label: 'Student email', type: 'email', required: true, hint: 'The certificate link is sent here.' },
    { name: 'batch', label: 'Batch', placeholder: 'Batch 12' },
    { name: 'course_name', label: 'Course name', required: true, full: true },
    { name: 'duration', label: 'Course duration', full: true, hint: 'Leave empty to hide this line on the certificate.' },
    { name: 'course_area', label: 'Course area', full: true, hint: 'Leave empty to hide this line on the certificate.' },
    { name: 'completion_date', label: 'Completion date', type: 'date', required: true },
    ...extra,
  ];
}

function editCert(row) {
  const d = getDefaults();
  openForm({
    title: row ? `Edit certificate ${row.certificate_no}` : 'Add Certificate',
    fields: certFields(row ? [] : [{ name: 'send_now', label: 'Send the certificate email right after saving', type: 'checkbox', full: true }]),
    values: row || { ...d, completion_date: today() },
    wide: true,
    intro: row ? '' : '<div class="help">The QR code and verification link are created automatically.</div>',
    onSubmit: async (v) => {
      const sendNow = v.send_now; delete v.send_now;
      v.email = String(v.email || '').toLowerCase();
      let saved;
      if (row) {
        must(await sb.from('certificates').update(v).eq('id', row.id).then((r) => { if (r.error) throw certErr(r.error); return r; }));
        toast('Saved');
      } else {
        saved = must(await sb.from('certificates').insert(v).select().single().then((r) => { if (r.error) throw certErr(r.error); return r; }));
        saveDefaults(v);
        toast('Certificate created');
      }
      await load();
      if (sendNow && saved) setTimeout(() => sendMany([saved]).catch((e) => toast(friendly(e), 'error', 6000)), 300); // after the dialog closes
    },
  });
}

// ---------- import (paste from Excel) ----------
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function parseDate(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m && MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3))) >= 0) {
    return `${m[3]}-${String(MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3))) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function splitLine(line) {
  const cols = line.includes('\t') ? line.split('\t') : line.split(',');
  return cols.map((c) => c.trim().replace(/^"|"$/g, '').trim());
}

function parseList(text, base) {
  const out = []; const errors = [];
  const seen = new Set();
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const [no, name, email, batch, date] = splitLine(raw);
    if (/^(certificate|cert|no|sl|serial)/i.test(no || '') && /name/i.test(name || '')) return; // header row
    const line = i + 1;
    if (!no) { errors.push(`Line ${line}: Certificate No. is missing`); return; }
    if (!name) { errors.push(`Line ${line}: Name is missing`); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) { errors.push(`Line ${line}: "${email || ''}" is not a valid email`); return; }
    if (seen.has(no)) { errors.push(`Line ${line}: Certificate No. ${no} is repeated in your list`); return; }
    seen.add(no);
    const d = date ? parseDate(date) : base.completion_date;
    if (!d) { errors.push(`Line ${line}: date "${date}" not understood (use 2026-10-02 or 02-10-2026)`); return; }
    out.push({ certificate_no: no, name, email: email.toLowerCase(), batch: batch || null, course_name: base.course_name, duration: base.duration || null, course_area: base.course_area || null, completion_date: d });
  });
  return { out, errors };
}

function importList() {
  const d = getDefaults();
  openForm({
    title: 'Import student list',
    submitLabel: 'Create certificates',
    wide: true,
    fields: [
      { name: 'course_name', label: 'Course name (all students)', required: true, full: true },
      { name: 'duration', label: 'Course duration (all students)', full: true },
      { name: 'course_area', label: 'Course area (all students)', full: true },
      { name: 'completion_date', label: 'Completion date (all students)', type: 'date', required: true, hint: 'A date in the list below overrides this for that student.' },
      { name: 'list', label: 'Student list', type: 'textarea', rows: 9, required: true, placeholder: '1057\tTowhid Ahmed Sadi\ttowhid@gmail.com\tBatch 12\n1058\tRumana Akter\trumana@gmail.com\tBatch 12', hint: 'One student per line: <b>Certificate No. · Name · Email · Batch · (optional) Date</b>. Copy the rows straight from Excel and paste here (tab or comma separated).' },
      { name: 'send_now', label: 'Send emails to everyone right after creating', type: 'checkbox', full: true },
    ],
    values: { ...d, completion_date: today() },
    onSubmit: async (v) => {
      const { out, errors } = parseList(v.list || '', v);
      if (errors.length) throw new Error(errors.slice(0, 6).join(' • ') + (errors.length > 6 ? ` • …and ${errors.length - 6} more` : ''));
      if (!out.length) throw new Error('No students found in the list.');
      if (out.length > 300) throw new Error('Please import at most 300 students at a time.');
      const made = must(await sb.from('certificates').insert(out).select().then((r) => { if (r.error) throw certErr(r.error); return r; }));
      saveDefaults(v);
      toast(`${made.length} certificate(s) created`, 'success');
      await load();
      if (v.send_now) setTimeout(() => sendMany(made).catch((e) => toast(friendly(e), 'error', 6000)), 300);
    },
  });
}

// ---------- preview ----------
async function preview(r) {
  const dlg = openInfo(`Certificate ${r.certificate_no} — ${r.name}`, `
    <div class="cert-frame"><canvas id="pv-canvas"></canvas></div>
    <div class="btn-row mt-3">
      <button type="button" class="btn btn-primary" data-pdf>${icon('download')} Download PDF</button>
      <button type="button" class="btn btn-light" data-png>${icon('download')} Download PNG</button>
      <a class="btn btn-ghost" href="${esc(certLink(r))}" target="_blank" rel="noopener">${icon('external')} Open student page</a>
      <a class="btn btn-ghost" href="${esc(site() + '/verify?id=' + r.code)}" target="_blank" rel="noopener">${icon('check')} Open verify page</a>
    </div>`, { wide: true });
  const canvas = $('#pv-canvas', dlg);
  const cert = { ...r, site_url: site() };
  try { await renderCertificate(canvas, cert); } catch (e) { toast('Could not draw the certificate: ' + e.message, 'error', 6000); }
  const name = safeFileName(r);
  $('[data-pdf]', dlg).addEventListener('click', async () => downloadBlob(await canvasToPdf(canvas), name + '.pdf'));
  $('[data-png]', dlg).addEventListener('click', async () => downloadBlob(await canvasBlob(canvas), name + '.png'));
}

// ---------- settings ----------
function openSettings() {
  const fields = [
    { name: 'cert_email_from', label: 'Send emails from', full: true, hint: 'Must use your Resend-verified domain, e.g. <b>Accounting Career Academy &lt;certificates@accountingcareeracademy.com&gt;</b>' },
    { name: 'cert_reply_to', label: 'Reply-to email (optional)', type: 'email' },
    { name: 'cert_copy_to', label: 'Send me a copy (BCC, optional)', type: 'email' },
    { name: 'cert_site_url', label: 'Website address', full: true, hint: 'Used in links and the QR code. Example: https://accountingcareeracademy.com' },
    { name: 'cert_linkedin_org_name', label: 'LinkedIn: issuing organization name', hint: 'Shown on LinkedIn if you have no company page ID.' },
    { name: 'cert_linkedin_org_id', label: 'LinkedIn: company page ID (optional)', hint: 'After you create your LinkedIn company page, open its admin view — the URL contains a number, e.g. linkedin.com/company/<b>12345678</b>/admin. Paste only the number so your logo appears on students’ certificates.' },
  ];
  const dlg = openForm({
    title: 'Certificate settings',
    fields,
    wide: true,
    values: { cert_email_from: DEFAULT_FROM, cert_site_url: siteUrl(), cert_linkedin_org_name: 'Accounting Career Academy', ...settings },
    intro: `<div class="help"><b>Test email</b> — saves nothing, just checks that Resend can send from the address below (save settings first if you changed it).
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input class="input" id="t-to" type="email" placeholder="your@email.com" style="max-width:280px"><button type="button" class="btn btn-light btn-sm" id="t-send">Send test email</button></div></div>`,
    onSubmit: async (v) => {
      const list = SETTING_KEYS.map((key) => ({ key, value: String(v[key] || '').trim() }));
      if (list[3].value) list[3].value = list[3].value.replace(/\/+$/, '');
      if (list[4].value && !list[3].value) throw new Error('Please enter the website address.');
      if (list[5].value && !/^\d+$/.test(list[5].value)) throw new Error('LinkedIn company page ID must be a number only.');
      must(await sb.from('website_settings').upsert(list, { onConflict: 'key' }));
      toast('Settings saved');
      await loadSettings();
    },
  });
  $('#t-send', dlg).addEventListener('click', async (e) => {
    const to = $('#t-to', dlg).value.trim();
    if (!to) return toast('Type an email address first', 'error');
    e.target.disabled = true;
    try {
      const r = must(await sb.rpc('admin_cert_test_email', { p_to: to }));
      toast(r.ok ? 'Test email queued — check your inbox in a minute.' : r.error, r.ok ? 'success' : 'error', 9000);
    } catch (err) { toast(friendly(err), 'error', 8000); }
    e.target.disabled = false;
  });
}

// ---------- page ----------
content.innerHTML = `
  <div class="help" style="margin-bottom:16px">
    <b>How it works:</b> add students (one by one, or paste a list from Excel) → <b>Send email</b>. Each student gets a link where they can download their certificate (PDF/PNG) and add it to LinkedIn. The QR code on the certificate opens a page that shows <b>“Certificate Verified”</b>.
  </div>
  <div class="toolbar">
    <div class="left">
      <input class="input" type="search" id="q" placeholder="Search name, email, no., batch…" aria-label="Search">
      <select class="select" id="flt" aria-label="Filter">
        <option value="">All</option><option value="unsent">Not sent / failed</option><option value="sent">Sent</option><option value="queued">Sending…</option><option value="revoked">Revoked</option>
      </select>
      <span class="small muted" id="count"></span>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" type="button" id="settings">${icon('sliders')} Settings</button>
      <button class="btn btn-light" type="button" id="send-all">${icon('mail')} Send to all unsent</button>
      <button class="btn btn-light" type="button" id="import">${icon('list')} Import List</button>
      <button class="btn btn-primary" type="button" id="add">${icon('plus')} Add Certificate</button>
    </div>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

$('#q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });
$('#flt').addEventListener('change', (e) => { filter = e.target.value; render(); });
$('#add').addEventListener('click', () => editCert(null));
$('#import').addEventListener('click', importList);
$('#settings').addEventListener('click', openSettings);
$('#send-all').addEventListener('click', async () => {
  const list = unsent();
  if (!list.length) return;
  if (!confirm(`Send the certificate email to ${list.length} student(s)?`)) return;
  await sendMany(list);
});

onActions($('#list'), () => visible(), {
  preview: (r) => preview(r),
  send: async (r) => {
    if (r.email_status === 'sent' && !confirm(`The email was already sent to ${r.email}.\n\nSend it again?`)) return;
    await sendMany([r]);
  },
  link: (r) => copyText(certLink(r), 'Certificate link copied'),
  edit: (r) => editCert(r),
  toggle: async (r) => {
    const revoke = r.status === 'valid';
    if (revoke && !confirm(`Revoke certificate ${r.certificate_no} (${r.name})?\n\nThe QR code will show “withdrawn” and the student cannot download it. You can restore it later.`)) return;
    must(await sb.from('certificates').update({ status: revoke ? 'revoked' : 'valid' }).eq('id', r.id));
    toast(revoke ? 'Certificate revoked' : 'Certificate restored');
    await load();
  },
  delete: async (r) => {
    if (!confirm(`Delete certificate ${r.certificate_no} (${r.name})?\n\nIts link and QR code will stop working. This cannot be undone.\n(Tip: use Revoke if you only want to withdraw it.)`)) return;
    must(await sb.from('certificates').delete().eq('id', r.id));
    toast('Deleted');
    await load();
  },
});

await load();
