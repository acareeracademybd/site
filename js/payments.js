// Checkout: bKash / Nagad manual payment → save to database → confirm on WhatsApp
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, $$, esc, icon, money, safeUrl, param, copyText, waLink, emptyState, errorText } from './utils.js';
import { courseUrl, ebookUrl } from './ui.js';

const root = $('#checkout-root');
const type = param('type') === 'ebook' ? 'ebook' : 'course';
const slug = param('slug');

function waMessage(d, product) {
  return [
    'আসসালামু আলাইকুম। আমি পেমেন্ট করেছি, অনুগ্রহ করে যাচাই করুন।',
    '',
    `Name: ${d.name}`,
    `Mobile: ${d.mobile}`,
    `Email: ${d.email}`,
    `${type === 'course' ? 'Course' : 'E-book'}: ${product.title}`,
    `Amount: ${money(product.price)}`,
    `Payment Method: ${d.method === 'bkash' ? 'bKash' : d.method === 'nagad' ? 'Nagad' : 'Free'}`,
    d.sender_number ? `Sender Number: ${d.sender_number}` : '',
    `Transaction ID: ${d.transaction_id || '-'}`,
  ].filter((l, i) => l || i === 1).join('\n');
}

function payCard(name, cls, number, kind) {
  if (!number) return '';
  return `<div class="pay-card">
    <div class="pm-name"><span class="pm-dot ${cls}"></span>${name}<span class="badge badge-muted" style="margin-left:auto">${esc(kind || 'Personal')}</span></div>
    <div class="pay-number"><span>${esc(number)}</span><button type="button" class="copy-btn" data-copy="${esc(number)}">Copy</button></div>
  </div>`;
}

(async () => {
  const settingsP = initLayout();
  if (!slug) {
    root.innerHTML = `${emptyState('Please choose a course or e-book first.')}<div class="btn-row mt-3" style="justify-content:center"><a class="btn btn-primary" href="/courses">Courses</a><a class="btn btn-outline" href="/ebooks">E-books</a></div>`;
    return;
  }
  let product, s;
  try {
    [product, s] = await Promise.all([type === 'ebook' ? api.ebook(slug) : api.course(slug), settingsP]);
  } catch (e) { root.innerHTML = emptyState(errorText(e)); return; }
  if (!product) { root.innerHTML = emptyState('This item is not available for purchase.'); return; }

  const isFree = !Number(product.price);
  const backUrl = type === 'ebook' ? ebookUrl(product) : courseUrl(product);
  const thumb = type === 'ebook' ? product.cover_url : product.thumbnail_url;

  root.innerHTML = `
  <div class="checkout-grid">
    <div>
      <ol class="steps">
        ${isFree ? '' : `<li class="card step">
          <h2>পেমেন্ট করুন</h2>
          <p class="mb-0">নিচের যেকোনো নম্বরে <b>${money(product.price)}</b> "Send Money" করুন।</p>
          <div class="pay-methods mt-2">
            ${payCard('bKash', 'pm-bkash', s.bkash_number, s.bkash_type)}
            ${payCard('Nagad', 'pm-nagad', s.nagad_number, s.nagad_type)}
          </div>
          ${s.payment_note ? `<p class="small muted mt-2 mb-0">${esc(s.payment_note)}</p>` : ''}
        </li>`}
        <li class="card step" id="step-form">
          <h2>আপনার তথ্য দিন</h2>
          <form class="form" id="pay-form" novalidate>
            <div class="field"><label for="p-name">Full Name *</label><input class="input" id="p-name" name="name" required maxlength="120" autocomplete="name"></div>
            <div class="form-row">
              <div class="field"><label for="p-mobile">Mobile *</label><input class="input" id="p-mobile" name="mobile" type="tel" inputmode="tel" required maxlength="20" autocomplete="tel" placeholder="01XXXXXXXXX"></div>
              <div class="field"><label for="p-email">Email *</label><input class="input" id="p-email" name="email" type="email" required maxlength="200" autocomplete="email" placeholder="you@gmail.com">
                <span class="hint">এই ইমেইল দিয়েই লগইন করবেন</span></div>
            </div>
            <div class="field"><span class="label">Product</span><input class="input" value="${esc(product.title)} — ${money(product.price)}" readonly></div>
            ${isFree ? '<input type="hidden" name="method" value="free">' : `
            <fieldset class="field" style="border:0;padding:0;margin:0">
              <legend class="label" style="margin-bottom:6px">Payment Method *</legend>
              <div class="choice-row">
                <label class="choice"><input type="radio" name="method" value="bkash" required><span><b>bKash</b><small>${esc(s.bkash_number || '')}</small></span></label>
                <label class="choice"><input type="radio" name="method" value="nagad"><span><b>Nagad</b><small>${esc(s.nagad_number || '')}</small></span></label>
              </div>
            </fieldset>
            <div class="form-row">
              <div class="field"><label for="p-sender">Sender Number</label><input class="input" id="p-sender" name="sender_number" type="tel" inputmode="tel" maxlength="20" placeholder="যে নম্বর থেকে পাঠিয়েছেন"></div>
              <div class="field"><label for="p-trx">Transaction ID *</label><input class="input code-input" id="p-trx" name="transaction_id" required maxlength="30" placeholder="e.g. 9A7B6C5D4E" spellcheck="false" autocapitalize="characters"></div>
            </div>`}
            <div id="pay-alert" role="alert"></div>
            <button class="btn btn-accent btn-block" type="submit">${isFree ? 'Enroll for Free' : 'I Have Made Payment'}</button>
          </form>
        </li>
        <li class="card step">
          <h2>WhatsApp-এ কনফার্ম করুন</h2>
          <p class="muted mb-0">ফর্ম জমা দেওয়ার পর একটি WhatsApp বাটন আসবে। মেসেজটি পাঠালে আমরা পেমেন্ট যাচাই করে আপনাকে <b>Access Code</b> পাঠাব।</p>
        </li>
      </ol>
    </div>
    <aside>
      <div class="card sticky-box">
        ${thumb ? `<img src="${esc(safeUrl(thumb))}" alt="${esc(product.title)}" width="640" height="${type === 'ebook' ? 853 : 360}" style="width:100%;${type === 'ebook' ? 'max-height:260px;object-fit:contain;background:var(--brand-50);padding:16px' : 'aspect-ratio:16/9;object-fit:cover'};border-radius:14px 14px 0 0">` : ''}
        <div class="card-pad">
          <span class="badge">${type === 'ebook' ? 'E-book' : product.course_type === 'live' ? 'Live Course' : 'Recorded Course'}</span>
          <h2 style="font-size:1.15rem;margin:10px 0 12px">${esc(product.title)}</h2>
          <div class="summary-line"><span>Price</span><span>${money(product.price)}</span></div>
          <div class="summary-line"><span>Total</span><span>${money(product.price)}</span></div>
          <a class="small" href="${backUrl}">← Back to details</a>
        </div>
      </div>
    </aside>
  </div>`;

  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, 'Number copied')));

  const form = $('#pay-form');
  const alertBox = $('#pay-alert');
  const show = (msg) => { alertBox.innerHTML = `<div class="alert alert-error">${esc(msg)}</div>`; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    Object.keys(d).forEach((k) => { d[k] = String(d[k] ?? '').trim(); });
    d.mobile = d.mobile.replace(/[\s-]/g, '');
    d.transaction_id = (d.transaction_id || '').toUpperCase().replace(/\s/g, '');
    if (d.name.length < 2) return show('Please enter your full name.');
    if (!/^(\+?880|0)?1[3-9]\d{8}$/.test(d.mobile)) return show('Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return show('Please enter a valid email address — you will use it to log in.');
    if (!d.method) return show('Please choose bKash or Nagad.');
    if (!isFree && !/^[A-Z0-9]{6,30}$/.test(d.transaction_id)) return show('Please enter the Transaction ID exactly as shown in your bKash/Nagad SMS.');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    const wa = waLink(s.whatsapp, waMessage(d, product));
    try {
      const res = await api.submitPayment({ ...d, product_type: type, product_id: product.id, product_title: product.title, amount: product.price });
      if (res?.transaction_id) d.transaction_id = res.transaction_id;
      $('#step-form').innerHTML = `
        <div class="success-box">
          <div class="success-icon">${icon('check')}</div>
          <h2 style="position:static">তথ্য জমা হয়েছে!</h2>
          <p>এখন নিচের বাটনে ক্লিক করে WhatsApp-এ মেসেজটি পাঠান। পেমেন্ট যাচাই হলে আপনাকে <b>Access Code</b> পাঠানো হবে।</p>
          <a class="btn btn-whatsapp btn-block" href="${esc(waLink(s.whatsapp, waMessage(d, product)))}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp-এ কনফার্ম করুন</a>
          <p class="small muted mt-3 mb-0">Access Code পাওয়ার পর <a href="/login">Login</a> পেজে আপনার ইমেইল <b>${esc(d.email)}</b> ও কোড দিয়ে লগইন করুন।</p>
        </div>`;
      $('#step-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = isFree ? 'Enroll for Free' : 'I Have Made Payment';
      alertBox.innerHTML = `<div class="alert alert-error">${esc(errorText(err))}</div>
        ${s.whatsapp ? `<a class="btn btn-whatsapp btn-sm mt-2" href="${esc(wa)}" target="_blank" rel="noopener">${icon('whatsapp')} সমস্যা হলে সরাসরি WhatsApp করুন</a>` : ''}`;
    }
  });
})();
