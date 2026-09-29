// Admin → Dashboard
import { adminInit, must, esc, icon, money, fmtDate, table, btn, onActions, waLink } from '../admin.js';
import { approvePayment, rejectPayment } from './payment-actions.js';

const { sb, content } = await adminInit('index', 'Dashboard');

let pending = [];
const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-IN');

async function load() {
  const [stats, pend, settingsRows] = await Promise.all([
    sb.rpc('admin_stats').then(must),
    sb.from('payments').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(10).then(must),
    sb.from('website_settings').select('key,value').then(must),
  ]);
  pending = pend;
  const s = Object.fromEntries(settingsRows.map((r) => [r.key, r.value || '']));
  const placeholder = (v) => !v || /X{4,}|your-domain|PLACEHOLDER/i.test(v);
  const checklist = [
    ['WhatsApp number', !placeholder(s.whatsapp), '/admin/settings#contact'],
    ['bKash / Nagad numbers', !placeholder(s.bkash_number) || !placeholder(s.nagad_number), '/admin/settings#payment'],
    ['Phone & email', !placeholder(s.phone) && !placeholder(s.email), '/admin/settings#contact'],
    ['YouTube demo video', !!s.youtube_video_url, '/admin/settings#youtube'],
    ['Trainer photo', !!s.trainer_photo_url, '/admin/settings#trainer'],
    ['Trainer achievements (remove placeholders)', !placeholder(s.trainer_achievements) && !placeholder(s.trainer_training_exp), '/admin/settings#trainer'],
    ['Real student testimonials', null, '/admin/testimonials'],
  ];

  const tiles = [
    ['Total Students', stats.students], ['Active Courses', stats.active_courses], ['Recorded Courses', stats.recorded_courses],
    ['E-books', stats.ebooks], ['Pending Payments', stats.pending_payments, true], ['Approved Payments', stats.approved_payments],
    ['Total Sales', taka(stats.total_sales)], ['This Month', taka(stats.month_sales)],
  ];

  content.innerHTML = `
    <div class="tile-grid">${tiles.map(([l, v, hl]) => `<div class="tile${hl && Number(v) ? ' hl' : ''}"><span>${l}</span><b>${esc(v ?? 0)}</b></div>`).join('')}</div>

    <div class="panel">
      <div class="panel-head"><h2>${icon('card')} Pending payments</h2><a class="btn btn-ghost btn-sm" href="/admin/payments">All payments</a></div>
      <div class="panel-body" id="pending-box">
        ${table([
          ['Date', (p) => fmtDate(p.created_at, true)],
          ['Student', (p) => `${esc(p.name)}<small>${esc(p.mobile)}</small>`],
          ['Product', (p) => `${esc(p.product_title)}<small>${money(p.amount)}</small>`],
          ['Method / TrxID', (p) => `${esc(p.method)}<small><b>${esc(p.transaction_id)}</b></small>`],
        ], pending, {
          empty: 'No pending payments. 🎉',
          actions: (p) => btn('approve', 'Approve', 'check', 'btn-primary') + btn('reject', 'Reject', 'x') +
            `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(waLink(p.mobile))}">${icon('whatsapp')}</a>`,
        })}
      </div>
    </div>

    <div class="grid grid-2">
      <div class="panel">
        <div class="panel-head"><h2>${icon('check')} Setup checklist</h2></div>
        <div class="panel-body">
          <ul class="check-list mb-0">${checklist.map(([label, ok, href]) => `<li>${ok === true ? icon('check') : `<span style="width:18px;height:18px;border:2px solid ${ok === null ? 'var(--line)' : 'var(--accent)'};border-radius:50%;flex:none;margin-top:3px"></span>`}
            <span>${ok === true ? esc(label) : `<a href="${href}">${esc(label)}</a>`}</span></li>`).join('')}</ul>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>${icon('grid')} Quick actions</h2></div>
        <div class="panel-body btn-row">
          <a class="btn btn-light btn-sm" href="/admin/students">${icon('plus')} Add student</a>
          <a class="btn btn-light btn-sm" href="/admin/courses">${icon('plus')} Add course</a>
          <a class="btn btn-light btn-sm" href="/admin/ebooks">${icon('plus')} Add e-book</a>
          <a class="btn btn-light btn-sm" href="/admin/blog">${icon('plus')} Write blog post</a>
          <a class="btn btn-light btn-sm" href="/admin/messages">${icon('mail')} Messages ${stats.unread_messages ? `(${stats.unread_messages} new)` : ''}</a>
          <a class="btn btn-light btn-sm" href="/admin/settings">${icon('sliders')} Website settings</a>
        </div>
      </div>
    </div>`;
}

onActions(content, () => pending, {
  approve: (p) => approvePayment(p, load),
  reject: (p) => rejectPayment(p, load),
});

await load();
