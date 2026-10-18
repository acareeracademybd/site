// Admin → Payments (approve / reject / add manually)
import { adminInit, must, esc, icon, table, iconBtn, btn, onActions, openForm, toast, statusBadge, fmtDate, money, waLink, $, $$ } from '../admin.js';
import { approvePayment, rejectPayment } from './payment-actions.js';
import { DEGREES, PROFESSIONS, EXPERIENCE, SOURCES } from '../registration.js';

const { sb, content } = await adminInit('payments', 'Payments');

let rows = [];
let status = new URLSearchParams(location.search).get('status') || 'pending';
let query = '';

content.innerHTML = `
  <div class="help" style="margin-bottom:16px">
    <b>How approval works:</b> the student pays by bKash/Nagad → submits the form (appears here as <b>Pending</b>) → sends you a WhatsApp message.
    Check your bKash/Nagad app for the <b>Transaction ID</b> and amount, then click <b>Approve</b>. The system gives access and creates an Access Code for you to send.
  </div>
  <div class="tabs" role="tablist">
    ${[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']].map(([v, l]) => `<button type="button" role="tab" data-tab="${v}" aria-selected="${v === status}">${l}</button>`).join('')}
  </div>
  <div class="toolbar">
    <div class="left"><input class="input" type="search" id="q" placeholder="Search name, mobile, email, TrxID…" aria-label="Search"><span class="small muted" id="sum"></span></div>
    <div class="btn-row">
      <button class="btn btn-outline" type="button" id="csv">Export Excel (CSV)</button>
      <button class="btn btn-primary" type="button" id="add">${icon('plus')} Add payment manually</button>
    </div>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

async function load() {
  let q = sb.from('payments').select('*').order('created_at', { ascending: false }).limit(1000);
  if (status) q = q.eq('status', status);
  rows = must(await q);
  render();
}

const visible = () => !query ? rows : rows.filter((p) => [p.name, p.mobile, p.email, p.transaction_id, p.product_title, p.sender_number, p.batch, p.profession, p.last_degree, p.heard_from].some((v) => String(v || '').toLowerCase().includes(query)));

function render() {
  const list = visible();
  const total = list.filter((p) => p.status === 'approved').reduce((n, p) => n + Number(p.amount || 0), 0);
  $('#sum').textContent = `${list.length} payment(s)${total ? ' · Approved total ' + money(total) : ''}`;
  $('#list').innerHTML = table([
    ['Date', (p) => fmtDate(p.created_at, true)],
    ['Student', (p) => `<b>${esc(p.name)}</b><small>${esc(p.mobile)} · ${esc(p.email)}</small>`],
    ['Product', (p) => `${esc(p.product_title)}<small>${p.product_type === 'course' ? 'Course' : 'E-book'}${p.batch ? ' · ' + esc(p.batch) : ''}</small>`],
    ['Registration', (p) => p.last_degree || p.profession
      ? `${esc(p.last_degree || '-')}<small>${esc(p.profession || '-')} · Exp: ${esc(p.experience || '-')}</small><small>Source: ${esc(p.heard_from || '-')}</small>`
      : '<span class="muted">—</span>'],
    ['Amount', (p) => money(p.amount)],
    ['Method', (p) => `${esc(p.method === 'bkash' ? 'bKash' : p.method === 'nagad' ? 'Nagad' : p.method)}${p.sender_number ? `<small>from ${esc(p.sender_number)}</small>` : ''}`],
    ['Transaction ID', (p) => `<code>${esc(p.transaction_id)}</code>`],
    ['Status', (p) => statusBadge(p.status) + (p.admin_note ? `<small>${esc(p.admin_note)}</small>` : '')],
  ], list, {
    empty: status === 'pending' ? 'No pending payments.' : 'No payments found.',
    actions: (p) => [
      p.status !== 'approved' ? btn('approve', 'Approve', 'check', 'btn-primary') : '',
      p.status === 'pending' ? btn('reject', 'Reject', 'x') : '',
      `<a class="icon-btn" title="WhatsApp student" target="_blank" rel="noopener" href="${esc(waLink(p.mobile))}">${icon('whatsapp')}</a>`,
      iconBtn('delete', 'trash', 'Delete record', true),
    ].join(''),
  });
}

$$('[data-tab]').forEach((t) => t.addEventListener('click', () => {
  status = t.dataset.tab;
  $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  history.replaceState(null, '', status ? '?status=' + status : '?status=');
  load();
}));
$('#q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

// Export the list on screen (current tab + search) as a CSV file that opens in Excel
$('#csv').addEventListener('click', () => {
  const cols = [
    ['Date', (p) => new Date(p.created_at).toLocaleString('en-GB')],
    ['Status', (p) => p.status], ['Name', (p) => p.name], ['WhatsApp', (p) => p.mobile], ['Email', (p) => p.email],
    ['Product', (p) => p.product_title], ['Type', (p) => p.product_type], ['Batch', (p) => p.batch],
    ['Last Degree', (p) => p.last_degree], ['Profession', (p) => p.profession], ['Experience', (p) => p.experience],
    ['Heard From', (p) => p.heard_from], ['Amount', (p) => p.amount], ['Method', (p) => p.method],
    ['Sender Number', (p) => p.sender_number], ['Transaction ID', (p) => p.transaction_id], ['Note', (p) => p.admin_note],
  ];
  const cell = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@]/.test(t)) t = "'" + t; // stop Excel treating text as a formula
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const lines = [cols.map((c) => cell(c[0])).join(','), ...visible().map((p) => cols.map((c) => cell(c[1](p))).join(','))];
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }); // BOM → Bangla shows correctly in Excel
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `registrations-${status || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#add').addEventListener('click', async () => {
  const [courses, ebooks] = await Promise.all([
    sb.from('courses').select('id,title,price').order('sort_order').then(must),
    sb.from('ebooks').select('id,title,price').order('sort_order').then(must),
  ]);
  const products = [...courses.map((c) => ['course:' + c.id, `Course — ${c.title} (${money(c.price)})`]), ...ebooks.map((b) => ['ebook:' + b.id, `E-book — ${b.title} (${money(b.price)})`])];
  openForm({
    title: 'Add payment manually',
    intro: '<p class="small muted mb-0">Use this when a student paid but could not submit the website form (e.g. sent details only on WhatsApp). The payment is saved as Pending — then click Approve.</p>',
    fields: [
      { name: 'name', label: 'Student name', required: true },
      { name: 'email', label: 'Student email (login email)', type: 'email', required: true },
      { name: 'mobile', label: 'Mobile', required: true, placeholder: '01XXXXXXXXX' },
      { name: 'product', label: 'Course / E-book', type: 'select', options: products, required: true },
      { name: 'method', label: 'Method', type: 'select', options: [['bkash', 'bKash'], ['nagad', 'Nagad'], ['other', 'Other / Cash']] },
      { name: 'amount', label: 'Amount received (৳)', type: 'number' },
      { name: 'transaction_id', label: 'Transaction ID', required: true },
      { name: 'sender_number', label: 'Sender number' },
      { name: 'batch', label: 'Batch (course only)', placeholder: 'e.g. Batch – 05' },
      { name: 'last_degree', label: 'Last degree', type: 'select', options: [['', '—'], ...DEGREES.map((x) => [x, x])] },
      { name: 'profession', label: 'Profession', type: 'select', options: [['', '—'], ...PROFESSIONS.map((x) => [x, x])] },
      { name: 'experience', label: 'Accounting experience', type: 'select', options: [['', '—'], ...EXPERIENCE.map((x) => [x, x])] },
      { name: 'heard_from', label: 'Heard about us from', type: 'select', options: [['', '—'], ...SOURCES.map((x) => [x, x])] },
    ],
    onSubmit: async (v) => {
      if (!/^[^@\s"',]+@[^@\s"',]+\.[^@\s"',]+$/.test(v.email)) throw new Error('Please enter a valid email address.');
      const [type, id] = v.product.split(':');
      const prod = (type === 'course' ? courses : ebooks).find((x) => x.id === id);
      must(await sb.from('payments').insert({
        name: v.name, email: v.email, mobile: v.mobile, product_type: type,
        course_id: type === 'course' ? id : null, ebook_id: type === 'ebook' ? id : null,
        product_title: prod.title, amount: v.amount ?? prod.price, method: v.method,
        transaction_id: v.transaction_id.toUpperCase(), sender_number: v.sender_number,
        batch: v.batch || null, last_degree: v.last_degree || null, profession: v.profession || null,
        experience: v.experience || null, heard_from: v.heard_from || null,
      }));
      toast('Payment added as Pending');
      status = 'pending';
      $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === 'pending')));
      await load();
    },
  });
});

onActions(content, () => visible(), {
  approve: (p) => approvePayment(p, load),
  reject: (p) => rejectPayment(p, load),
  delete: async (p) => {
    if (!confirm(`Delete this payment record (${p.transaction_id})?${p.status === 'approved' ? '\n\nNote: the student keeps access. Remove access from Students if needed.' : ''}`)) return;
    must(await sb.from('payments').delete().eq('id', p.id));
    toast('Deleted');
    await load();
  },
});

await load();
