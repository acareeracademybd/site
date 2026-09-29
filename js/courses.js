// Courses list, Recorded Courses list and Course Details page
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, $$, esc, icon, lines, money, priceHtml, richText, safeUrl, slugFromUrl, setMeta, emptyState, openVideoModal, fmtDate, waLink, errorText } from './utils.js';
import { courseCard, typeBadge, checkoutUrl } from './ui.js';

const page = document.querySelector('main')?.dataset.page;

// Free-preview buttons anywhere on the page
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-preview]');
  if (b) { e.preventDefault(); openVideoModal(b.dataset.preview, b.dataset.title || 'Free preview'); }
});

async function listPage(type) {
  const listEl = $('#course-list');
  let all = [];
  try { all = await api.courses(type ? { type } : {}); }
  catch (e) { listEl.innerHTML = emptyState(errorText(e)); return; }
  const render = (filter) => {
    const items = filter ? all.filter((c) => c.course_type === filter) : all;
    listEl.innerHTML = items.length ? items.map((c) => courseCard(c, { preview: type === 'recorded' })).join('') : emptyState('No courses found in this category yet.');
  };
  render(new URLSearchParams(location.search).get('type') || '');
  $$('[data-filter]').forEach((btn) => {
    if (btn.dataset.filter === (new URLSearchParams(location.search).get('type') || '')) {
      $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    }
    btn.addEventListener('click', () => {
      $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render(btn.dataset.filter);
    });
  });
}

function checkList(items, cols2 = false) {
  return `<ul class="check-list${cols2 ? ' cols-2' : ''}">${items.map((i) => `<li>${icon('check')}<span>${esc(i)}</span></li>`).join('')}</ul>`;
}

async function detailPage(settingsP) {
  const slug = slugFromUrl('course');
  const root = $('#course-detail');
  let c;
  try { c = slug ? await api.course(slug) : null; }
  catch (e) { root.innerHTML = emptyState(errorText(e)); return; }
  if (!c) {
    $('#course-title').textContent = 'Course not found';
    root.innerHTML = `<div>${emptyState('This course is not available. It may have been removed or unpublished.')}<p class="center mt-3"><a class="btn btn-primary" href="/courses">See all courses</a></p></div>`;
    return;
  }
  setMeta(`${c.title} — Accounting Career Academy`, c.short_description, { canonical: true });
  $('#crumb-title').textContent = c.title;
  $('#course-title').textContent = c.title;
  $('#course-short').textContent = c.short_description || '';
  $('#course-badges').innerHTML = typeBadge(c.course_type) + (c.level ? ` <span class="badge badge-muted">${esc(c.level)}</span>` : '');

  const [modules, faqs, settings] = await Promise.all([api.curriculum(c.id).catch(() => []), api.faqs(c.id).catch(() => []), settingsP]);
  const lessonCount = modules.reduce((n, m) => n + (m.lessons?.length || 0), 0);
  const isLive = c.course_type === 'live';
  const enroll = checkoutUrl('course', c.slug);

  const curriculum = modules.length ? `<div class="accordion">${modules.map((m, i) => `
      <details${i === 0 ? ' open' : ''}>
        <summary><span>${esc(m.title)}</span><small>${m.lessons?.length || 0} lessons</small></summary>
        <div class="acc-body">
          ${m.description ? `<p class="muted small">${esc(m.description)}</p>` : ''}
          <ul class="lesson-list">${(m.lessons || []).map((l) => `
            <li>${icon(l.is_free ? 'play' : 'lock')}<span>${esc(l.title)}</span>
              ${l.is_free && l.video_url ? `<button type="button" class="link-btn" data-preview="${esc(l.video_url)}" data-title="${esc(l.title)}">Preview</button>` : ''}
              ${l.is_free && !l.video_url ? '<span class="badge badge-success">Free</span>' : ''}
              <span class="dur">${esc(l.duration || '')}</span></li>`).join('')}
          </ul>
        </div>
      </details>`).join('')}</div>` : emptyState('Curriculum will be published soon.');

  const schedule = isLive ? `
    <section>
      <h2>Class Schedule</h2>
      <div class="schedule">
        ${c.schedule_days ? `<div><span>Class days</span><b>${esc(c.schedule_days)}</b></div>` : ''}
        ${c.class_time ? `<div><span>Class time</span><b>${esc(c.class_time)}</b></div>` : ''}
        ${c.start_date ? `<div><span>Batch starts</span><b>${fmtDate(c.start_date)}</b></div>` : ''}
        ${c.duration ? `<div><span>Duration</span><b>${esc(c.duration)}</b></div>` : ''}
        ${c.platform ? `<div><span>Platform</span><b>${esc(c.platform)}</b></div>` : ''}
        <div><span>Course fee</span><b>${money(c.price)}</b></div>
      </div>
      <p class="small muted mt-2">${icon('lock', 'ico')} Class link শুধুমাত্র ভর্তি নিশ্চিত হওয়া শিক্ষার্থীদের Dashboard-এ দেখানো হবে।</p>
    </section>` : '';

  const info = [
    ['Course type', isLive ? 'LIVE' : 'Recorded'],
    ['Duration', c.duration],
    ['Lessons', lessonCount ? String(lessonCount) : ''],
    ['Level', c.level],
    ['Instructor', c.instructor],
    ...(isLive ? [['Class days', c.schedule_days], ['Class time', c.class_time], ['Platform', c.platform]] : [['Access', 'Watch anytime']]),
  ].filter(([, v]) => v);

  root.innerHTML = `
    <div class="detail-main">
      <section>
        <h2>Course Overview</h2>
        <div class="prose">${richText(c.full_description || c.short_description || '')}</div>
      </section>
      ${schedule}
      ${lines(c.what_you_learn).length ? `<section><h2>What you will learn</h2>${checkList(lines(c.what_you_learn), true)}</section>` : ''}
      ${lines(c.who_should_join).length ? `<section><h2>Who should join</h2>${checkList(lines(c.who_should_join))}</section>` : ''}
      <section id="curriculum"><h2>Course Curriculum</h2>${curriculum}</section>
      ${c.instructor ? `<section><h2>Instructor</h2>
        <div class="card card-pad" style="display:flex;gap:16px;align-items:center">
          <span class="feature" style="padding:0"><span class="ico-wrap" style="margin:0">${icon('user')}</span></span>
          <div><b style="color:var(--ink)">${esc(c.instructor)}</b><div class="small muted">${esc(settings.trainer_title || '')}</div>
          <a class="small" href="/about">About the trainer →</a></div>
        </div></section>` : ''}
      ${faqs.length ? `<section><h2>FAQ</h2><div class="accordion">${faqs.map((f) => `<details><summary>${esc(f.question)}</summary><div class="acc-body"><p class="mb-0">${esc(f.answer)}</p></div></details>`).join('')}</div></section>` : ''}
      <section id="enroll">
        <h2>Registration / Enrollment</h2>
        <ol class="prose" style="font-size:1rem">
          <li><b>Enroll Now</b> বাটনে ক্লিক করুন এবং bKash/Nagad-এ কোর্স ফি পাঠান।</li>
          <li>ফর্মে আপনার নাম, মোবাইল, ইমেইল ও Transaction ID দিন।</li>
          <li>WhatsApp-এ কনফার্মেশন মেসেজ পাঠান।</li>
          <li>পেমেন্ট যাচাইয়ের পর আপনি একটি <b>Access Code</b> পাবেন — Email + Access Code দিয়ে লগইন করুন।</li>
        </ol>
        <a class="btn btn-accent" href="${enroll}">Enroll Now — ${money(c.price)}</a>
      </section>
    </div>
    <aside class="detail-aside">
      <div class="card buy-box sticky-box">
        <div class="thumb"><img src="${esc(safeUrl(c.thumbnail_url, '/assets/images/demo/demo-video.svg'))}" alt="${esc(c.title)}" width="640" height="360"></div>
        <div class="body">
          ${priceHtml(c.price, c.old_price)}
          <a class="btn btn-accent btn-block" href="${enroll}">Enroll Now</a>
          ${c.preview_video_url ? `<button type="button" class="btn btn-outline btn-block" data-preview="${esc(c.preview_video_url)}" data-title="${esc(c.title)}">${icon('play')} Free Preview</button>` : ''}
          <ul class="info-list">${info.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
          ${settings.whatsapp ? `<a class="btn btn-ghost btn-block btn-sm" target="_blank" rel="noopener" href="${esc(waLink(settings.whatsapp, 'আমি "' + c.title + '" কোর্স সম্পর্কে জানতে চাই।'))}">${icon('whatsapp')} প্রশ্ন আছে? WhatsApp করুন</a>` : ''}
        </div>
      </div>
    </aside>`;

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

const settingsP = initLayout();
if (page === 'courses') listPage();
else if (page === 'recorded') listPage('recorded');
else if (page === 'course') detailPage(settingsP);
