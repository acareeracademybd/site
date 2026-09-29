// E-book store and E-book details page
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, esc, icon, priceHtml, richText, safeUrl, slugFromUrl, setMeta, emptyState, errorText, waLink } from './utils.js';
import { ebookCard, checkoutUrl } from './ui.js';

const page = document.querySelector('main')?.dataset.page;

async function listPage() {
  const el = $('#ebook-list');
  try {
    const list = await api.ebooks();
    el.innerHTML = list.length ? list.map(ebookCard).join('') : emptyState('E-books will be published soon.');
  } catch (e) { el.innerHTML = emptyState(errorText(e)); }
}

async function detailPage(settingsP) {
  const slug = slugFromUrl('ebook');
  const root = $('#ebook-detail');
  let b;
  try { b = slug ? await api.ebook(slug) : null; }
  catch (e) { root.innerHTML = emptyState(errorText(e)); return; }
  if (!b) {
    $('#ebook-title').textContent = 'E-book not found';
    root.innerHTML = `<div>${emptyState('This e-book is not available.')}<p class="center mt-3"><a class="btn btn-primary" href="/ebooks">See all e-books</a></p></div>`;
    return;
  }
  const settings = await settingsP;
  setMeta(`${b.title} — Accounting Career Academy`, b.short_description, { canonical: true });
  $('#crumb-title').textContent = b.title;
  $('#ebook-title').textContent = b.title;
  $('#ebook-short').textContent = b.short_description || '';
  const buy = checkoutUrl('ebook', b.slug);
  const info = [['Author', b.author], ['Pages', b.pages], ['Format', 'PDF'], ['Delivery', 'Download from your Dashboard after payment approval']].filter(([, v]) => v);

  root.innerHTML = `
    <div class="detail-main">
      <section class="ebook-hero">
        <div class="card ebook-hero-cover"><img src="${esc(safeUrl(b.cover_url, '/assets/images/demo/ebook-tally-prime-gold-ebook.svg'))}" alt="${esc(b.title)} cover" width="480" height="640"></div>
        <div>
          <h2>About this e-book</h2>
          <div class="prose">${richText(b.description || b.short_description || '')}</div>
          ${b.sample_url ? `<a class="btn btn-outline" href="${esc(safeUrl(b.sample_url))}" target="_blank" rel="noopener">${icon('eye')} Sample / Preview PDF</a>` : ''}
        </div>
      </section>
      <section>
        <h2>How to buy</h2>
        <ol class="prose" style="font-size:1rem">
          <li><b>Buy Now</b> বাটনে ক্লিক করে bKash/Nagad-এ মূল্য পরিশোধ করুন।</li>
          <li>Transaction ID দিয়ে ফর্ম পূরণ করুন ও WhatsApp-এ কনফার্ম করুন।</li>
          <li>যাচাইয়ের পর Access Code পাবেন — লগইন করে <b>Dashboard → My E-books</b> থেকে PDF ডাউনলোড করুন।</li>
        </ol>
      </section>
    </div>
    <aside class="detail-aside">
      <div class="card buy-box sticky-box">
        <div class="body">
          ${priceHtml(b.price, b.old_price)}
          <a class="btn btn-accent btn-block" href="${buy}">Buy Now</a>
          <ul class="info-list">${info.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
          ${settings.whatsapp ? `<a class="btn btn-ghost btn-block btn-sm" target="_blank" rel="noopener" href="${esc(waLink(settings.whatsapp, 'আমি "' + b.title + '" ই-বুক সম্পর্কে জানতে চাই।'))}">${icon('whatsapp')} WhatsApp-এ জিজ্ঞাসা করুন</a>` : ''}
        </div>
      </div>
    </aside>`;
}

const settingsP = initLayout();
if (page === 'ebooks') listPage();
else if (page === 'ebook') detailPage(settingsP);
