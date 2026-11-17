// /verify?id=CODE — page opened by scanning the QR code on a certificate
import { initLayout } from './settings.js';
import { rpc } from './supabase.js';
import { $, esc, param } from './utils.js';
import { formatDate } from './certificate-render.js';

initLayout();
const root = $('#verify-root');

const card = (cls, mark, title, text, extra = '') =>
  (root.innerHTML = `<div class="card verify-card ${cls}"><div class="mark" aria-hidden="true">${mark}</div><h1>${esc(title)}</h1><p class="muted">${esc(text)}</p>${extra}</div>`);

(async () => {
  const id = (param('id') || '').trim();
  if (!id) return card('bad', '✕', 'No certificate code', 'Please scan the QR code printed on the certificate.');
  let c;
  try { c = await rpc('certificate_public', { p_code: id }); }
  catch { return card('bad', '!', 'Could not check right now', 'Please check your internet connection and scan again.'); }
  if (!c?.found) return card('bad', '✕', 'Certificate not found', 'No certificate matches this code. It may be fake or the code was typed wrongly.');

  const rows = [
    ['Name', c.name], ['Course', c.course_name], c.batch && ['Batch', c.batch],
    ['Certificate No.', c.certificate_no], ['Completion date', formatDate(c.completion_date)],
    c.duration && ['Duration', c.duration], ['Issued by', 'Accounting Career Academy'],
  ].filter(Boolean);
  const list = `<dl class="verify-list">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;

  if (c.status === 'revoked') return card('warn', '!', 'Certificate withdrawn', 'This certificate was issued earlier but has since been withdrawn by Accounting Career Academy.', list);
  card('ok', '✔', 'Certificate Verified', 'This certificate is genuine and was issued by Accounting Career Academy.', `${list}
    <div class="btn-row" style="justify-content:center;margin-top:18px"><a class="btn btn-outline" href="/certificate?id=${encodeURIComponent(c.code)}">View certificate</a></div>`);
})();
