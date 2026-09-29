// Blog list and blog post page
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, $$, esc, icon, fmtDate, richText, safeUrl, slugFromUrl, setMeta, emptyState, errorText } from './utils.js';
import { postCard } from './ui.js';

const page = document.querySelector('main')?.dataset.page;

async function listPage() {
  const el = $('#post-list');
  let all = [];
  try { all = await api.posts(); } catch (e) { el.innerHTML = emptyState(errorText(e)); return; }
  const render = (cat) => {
    const items = cat ? all.filter((p) => p.category === cat) : all;
    el.innerHTML = items.length ? items.map(postCard).join('') : emptyState('No posts in this category yet.');
  };
  const initial = new URLSearchParams(location.search).get('category') || '';
  render(initial);
  $$('#blog-filter [data-cat]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.cat === initial));
    btn.addEventListener('click', () => {
      $$('#blog-filter [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(btn.dataset.cat);
    });
  });
}

async function postPage() {
  const slug = slugFromUrl('blog');
  let p;
  try { p = slug ? await api.post(slug) : null; }
  catch (e) { $('#post-body').innerHTML = emptyState(errorText(e)); return; }
  if (!p) {
    $('#post-title').textContent = 'Post not found';
    $('#post-body').innerHTML = `${emptyState('This article is not available.')}<p class="center mt-3"><a class="btn btn-primary" href="/blog">Back to blog</a></p>`;
    return;
  }
  setMeta(`${p.title} — Accounting Career Academy`, p.short_description, { canonical: true });
  $('#post-cat').innerHTML = `<a class="badge" href="/blog?category=${encodeURIComponent(p.category)}">${esc(p.category)}</a>`;
  $('#post-title').textContent = p.title;
  $('#post-meta').innerHTML = `<li>${icon('calendar')}${fmtDate(p.published_at)}</li>${p.author ? `<li>${icon('user')}${esc(p.author)}</li>` : ''}`;
  $('#post-body').innerHTML = `
    ${p.featured_image ? `<img src="${esc(safeUrl(p.featured_image))}" alt="${esc(p.title)}" width="760" height="428" style="border-radius:14px;margin-bottom:28px;width:100%;max-width:760px;aspect-ratio:16/9;object-fit:cover">` : ''}
    <div class="prose">${richText(p.content || '')}</div>
    <div class="card card-pad mt-4" style="max-width:760px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <div><b style="color:var(--ink)">হাতে-কলমে শিখতে চান?</b><div class="small muted">আমাদের প্র্যাক্টিক্যাল কোর্সগুলো দেখুন।</div></div>
      <a class="btn btn-accent btn-sm" href="/courses">কোর্স দেখুন</a>
    </div>`;
  try {
    const related = (await api.posts({ limit: 4 })).filter((x) => x.slug !== p.slug).slice(0, 3);
    if (related.length) { $('#related-posts').innerHTML = related.map(postCard).join(''); $('#related-section').hidden = false; }
  } catch { /* optional */ }
}

initLayout();
if (page === 'blog') listPage();
else if (page === 'post') postPage();
