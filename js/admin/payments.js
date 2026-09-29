// Admin → Payments (approve / reject / add manually)
import { adminInit, must, esc, icon, table, iconBtn, btn, onActions, openForm, toast, statusBadge, fmtDate, money, waLink, $, $$ } from '../admin.js';
import { approvePayment, rejectPayment } from './payment-actions.js';

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
    <button class="btn btn-primary" type="button" id="add">${icon('plus')} Add payment manually</button>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

async function load() {
  let q = sb.from('payments').select('*').order('created_at', { ascending: false }).limit(1000);
  if (status) q = q.eq('status', status);
  rows = must(await q);
  render();
}

const visible = () => !query ? rows : rows.filter((p) => [p.name, p.mobile, p.email, p.transaction_id, p.product_title, p.sender_number].some((v) => String(v || '').toLowerCase().includes(query)));

function render() {
  const list = visible();
  const total = list.filter((p) => p.status === 'approved').reduce((n, p) => n + Number(p.amount || 0), 0);
  $('#sum').textContent = `${list.length} payment(s)${total ? ' · Approved total ' + money(total) : ''}`;
  $('#list').innerHTML = table([
    ['Date', (p) => fmtDate(p.created_at, true)],
    ['Student', (p) => `<b>${esc(p.name)}</b><small>${esc(p.mobile)} · ${esc(p.email)}</small>`],
    ['Product', (p) => `${esc(p.product_title)}<small>${p.product_type === 'course' ? 'Course' : 'E-book'}</small>`],
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
