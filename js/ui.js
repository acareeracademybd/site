// Re-usable HTML blocks (cards) used on several pages
import { esc, safeUrl, icon, priceHtml, lines, fmtDate, initials } from './utils.js';

export const courseUrl = (c) => `/course/${encodeURIComponent(c.slug)}`;
export const ebookUrl = (e) => `/ebook/${encodeURIComponent(e.slug)}`;
export const postUrl = (p) => `/blog/${encodeURIComponent(p.slug)}`;
export const checkoutUrl = (type, slug) => `/checkout?type=${type}&slug=${encodeURIComponent(slug)}`;

export const typeBadge = (t) => t === 'live'
  ? '<span class="badge badge-live">Live</span>'
  : '<span class="badge">Recorded</span>';

const img = (src, alt, w, h, fallback) =>
  `<img src="${esc(safeUrl(src, fallback))}" alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`;

export function courseCard(c, opts = {}) {
  const meta = [];
  if (c.duration) meta.push(`<li>${icon('clock')}${esc(c.duration)}</li>`);
  if (c.course_type === 'live' && c.schedule_days) meta.push(`<li>${icon('calendar')}${esc(c.schedule_days)}</li>`);
  else if (c.level) meta.push(`<li>${icon('trend')}${esc(c.level)}</li>`);
  return `<article class="card course-card">
    <a class="thumb" href="${courseUrl(c)}" tabindex="-1" aria-hidden="true">${img(c.thumbnail_url, c.title, 640, 360, '/assets/images/demo/demo-video.svg')}</a>
    <div class="body">
      <div>${typeBadge(c.course_type)}</div>
      <h3><a href="${courseUrl(c)}">${esc(c.title)}</a></h3>
      <p>${esc(c.short_description || '')}</p>
      <ul class="meta">${meta.join('')}</ul>
      ${opts.preview ? (c.preview_video_url
        ? `<button type="button" class="link-btn" style="align-self:flex-start" data-preview="${esc(c.preview_video_url)}" data-title="${esc(c.title)}">${icon('play')} Free preview</button>`
        : `<a class="link-btn" style="align-self:flex-start" href="${courseUrl(c)}#curriculum">${icon('play')} Free preview lessons</a>`) : ''}
      <div class="foot">
        ${priceHtml(c.price, c.old_price)}
        <div class="card-actions">
          <a class="btn btn-outline btn-sm" href="${courseUrl(c)}">View Details</a>
          <a class="btn btn-accent btn-sm" href="${checkoutUrl('course', c.slug)}">Enroll Now</a>
        </div>
      </div>
    </div>
  </article>`;
}

export function featuredCourseCard(c) {
  const benefits = lines(c.benefits).slice(0, 5);
  return `<article class="card featured-card">
    <div class="body">
      <span class="eyebrow" style="margin:0">Featured Course</span> ${typeBadge(c.course_type)}
      <h2>${esc(c.title)}</h2>
      <p class="muted small">${esc(c.short_description || '')}</p>
      <ul class="meta mb-0" style="margin-bottom:14px">
        ${c.duration ? `<li>${icon('clock')}${esc(c.duration)}</li>` : ''}
        ${c.course_type === 'live' && c.schedule_days ? `<li>${icon('calendar')}${esc(c.schedule_days)}</li>` : ''}
      </ul>
      ${benefits.length ? `<ul class="check-list">${benefits.map((b) => `<li>${icon('check')}<span>${esc(b)}</span></li>`).join('')}</ul>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        ${priceHtml(c.price, c.old_price)}
      </div>
      <div class="card-actions mt-2">
        <a class="btn btn-outline" href="${courseUrl(c)}">View Course</a>
        <a class="btn btn-accent" href="${checkoutUrl('course', c.slug)}">Enroll</a>
      </div>
    </div>
  </article>`;
}

export function ebookCard(e) {
  return `<article class="card ebook-card">
    <a class="cover" href="${ebookUrl(e)}" tabindex="-1" aria-hidden="true">${img(e.cover_url, e.title + ' cover', 240, 320, '/assets/images/demo/ebook-tally-prime-gold-ebook.svg')}</a>
    <div class="body">
      <h3><a href="${ebookUrl(e)}">${esc(e.title)}</a></h3>
      <p>${esc(e.short_description || '')}</p>
      <ul class="meta">${e.pages ? `<li>${icon('file')}${esc(e.pages)} pages</li>` : ''}</ul>
      ${priceHtml(e.price, e.old_price)}
      <div class="btn-row">
        <a class="btn btn-outline btn-sm" href="${ebookUrl(e)}">View</a>
        <a class="btn btn-accent btn-sm" href="${checkoutUrl('ebook', e.slug)}">Buy</a>
      </div>
    </div>
  </article>`;
}

export function postCard(p) {
  return `<article class="card post-card">
    <a class="thumb" href="${postUrl(p)}" tabindex="-1" aria-hidden="true">${img(p.featured_image, p.title, 640, 360, '/assets/images/demo/blog-debit-credit-rules-made-easy.svg')}</a>
    <div class="body">
      <div><span class="badge">${esc(p.category)}</span></div>
      <h3><a href="${postUrl(p)}">${esc(p.title)}</a></h3>
      <p>${esc(p.short_description || '')}</p>
      <ul class="meta"><li>${icon('calendar')}${fmtDate(p.published_at)}</li>${p.author ? `<li>${icon('user')}${esc(p.author)}</li>` : ''}</ul>
      <a class="read" href="${postUrl(p)}">Read more →</a>
    </div>
  </article>`;
}

export function testimonialCard(t) {
  const n = Math.max(1, Math.min(5, Number(t.rating) || 5));
  return `<figure class="card testimonial" style="margin:0">
    <div class="stars" aria-label="${n} out of 5 stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</div>
    <blockquote>${esc(t.message)}</blockquote>
    <figcaption class="who">
      <span class="avatar">${t.photo_url ? `<img src="${esc(safeUrl(t.photo_url))}" alt="" width="44" height="44" loading="lazy">` : esc(initials(t.name))}</span>
      <span><b>${esc(t.name)}</b><span>${esc(t.designation || '')}</span></span>
    </figcaption>
  </figure>`;
}

const FEATURE_ICONS = ['book', 'briefcase', 'monitor', 'grid', 'trend', 'user', 'chat', 'check', 'award', 'users', 'video', 'ledger', 'clock'];
export function featureCard(f) {
  const ic = FEATURE_ICONS.includes(f.icon) ? f.icon : 'check';
  return `<div class="card feature"><div class="ico-wrap">${icon(ic)}</div><h3>${esc(f.title)}</h3><p>${esc(f.description || '')}</p></div>`;
}
export { FEATURE_ICONS };
