// Student dashboard: courses, e-books, live classes, profile
import { initLayout } from './settings.js';
import { requireStudent, logoutStudent, sessionExpired, isSessionError } from './auth.js';
import { $, $$, esc, icon, fmtDate, money, safeUrl, emptyState, toast, errorText } from './utils.js';

const content = $('#dash-content');

function courseCardHtml(c) {
  const total = Number(c.total_lessons) || 0;
  const done = Number(c.done_lessons) || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<article class="card course-card">
    <div class="thumb"><img src="${esc(safeUrl(c.thumbnail_url, '/assets/images/demo/demo-video.svg'))}" alt="${esc(c.title)}" width="640" height="360" loading="lazy"></div>
    <div class="body">
      <div>${c.course_type === 'live' ? '<span class="badge badge-live">Live</span>' : '<span class="badge">Recorded</span>'}</div>
      <h3>${esc(c.title)}</h3>
      <div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Course progress"><i style="width:${pct}%"></i></div>
        <div class="small muted mt-1">${done}/${total} lessons · ${pct}% complete</div>
      </div>
      ${c.expires_at ? `<div class="small muted">${icon('clock')} Access until ${fmtDate(c.expires_at)}</div>` : ''}
      <div class="foot">
        <a class="btn btn-primary btn-block" href="/learn?course=${encodeURIComponent(c.slug)}">${done ? 'Continue' : 'Start Course'} ${icon('arrow-right')}</a>
        ${c.course_type === 'live' ? '<a class="btn btn-ghost btn-sm btn-block" href="#live-classes">Live class information</a>' : ''}
      </div>
    </div>
  </article>`;
}

function ebookRow(b) {
  return `<div class="card list-card">
    <div class="lc-img"><img src="${esc(safeUrl(b.cover_url, '/assets/images/demo/ebook-tally-prime-gold-ebook.svg'))}" alt="" width="56" height="75" loading="lazy"></div>
    <div class="lc-body"><h3>${esc(b.title)}</h3><div class="small muted">${[b.author, b.pages ? b.pages + ' pages' : '', 'PDF'].filter(Boolean).map(esc).join(' · ')}${b.expires_at ? ' · Access until ' + fmtDate(b.expires_at) : ''}</div></div>
    ${b.has_file ? `<button class="btn btn-accent btn-sm" type="button" data-download="${esc(b.id)}">${icon('download')} Download</button>`
                 : '<span class="badge badge-warning">File coming soon</span>'}
  </div>`;
}

function liveCard(l) {
  return `<div class="card live-card">
    <div class="small muted">${esc(l.course_title)}</div>
    <h3 style="margin:0">${esc(l.title)}</h3>
    <div class="when">
      ${l.class_date ? `<span>${icon('calendar')} ${fmtDate(l.class_date)}</span>` : ''}
      ${l.start_time ? `<span>${icon('clock')} ${esc(l.start_time)}</span>` : ''}
      ${l.platform ? `<span>${icon('video')} ${esc(l.platform)}</span>` : ''}
    </div>
    ${(l.meeting_id || l.passcode) ? `<div class="small">${l.meeting_id ? `Meeting ID: <b>${esc(l.meeting_id)}</b>` : ''} ${l.passcode ? ` · Passcode: <b>${esc(l.passcode)}</b>` : ''}</div>` : ''}
    ${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}
    ${l.meeting_link ? `<div><a class="btn btn-primary btn-sm" href="${esc(safeUrl(l.meeting_link))}" target="_blank" rel="noopener">${icon('video')} Join Class</a></div>` : ''}
  </div>`;
}

function statusBadge(s) {
  return s === 'approved' ? '<span class="badge badge-success">Approved</span>'
    : s === 'rejected' ? '<span class="badge badge-danger">Rejected</span>' : '<span class="badge badge-warning">Pending</span>';
}

(async () => {
  initLayout();
  const sb = await requireStudent();
  if (!sb) return;

  $('#logout-btn').addEventListener('click', () => logoutStudent('/login'));

  let d;
  try {
    const res = await sb.rpc('student_dashboard');
    if (res.error) throw res.error;
    d = res.data;
  } catch (err) {
    if (isSessionError(err)) return sessionExpired();
    content.innerHTML = emptyState(errorText(err));
    return;
  }

  const st = d.student || {};
  $('#welcome').textContent = `Welcome, ${st.name || 'Student'}`;
  try { localStorage.setItem('aca-student-name', st.name || 'Student'); } catch { /* ignore */ }

  const liveCourses = d.courses.filter((c) => c.course_type === 'live');
  const liveFallback = liveCourses.filter((c) => !d.live_classes.some((l) => l.course_title === c.title)).map((c) => `
    <div class="card live-card"><div class="small muted">${esc(c.title)}</div>
      <div class="when">${c.schedule_days ? `<span>${icon('calendar')} ${esc(c.schedule_days)}</span>` : ''}${c.class_time ? `<span>${icon('clock')} ${esc(c.class_time)}</span>` : ''}${c.platform ? `<span>${icon('video')} ${esc(c.platform)}</span>` : ''}</div>
      <div class="small muted">পরবর্তী ক্লাসের লিংক শীঘ্রই এখানে দেওয়া হবে।</div></div>`).join('');

  content.innerHTML = `
    <section class="dash-section" id="my-courses">
      <h2>${icon('video')} My Courses</h2>
      ${d.courses.length ? `<div class="grid grid-3">${d.courses.map(courseCardHtml).join('')}</div>`
        : `${emptyState('আপনি এখনো কোনো কোর্সে ভর্তি হননি।', 'video')}<p class="center mt-2"><a class="btn btn-accent btn-sm" href="/courses">Browse courses</a></p>`}
    </section>

    <section class="dash-section" id="my-ebooks">
      <h2>${icon('book')} My E-books</h2>
      ${d.ebooks.length ? d.ebooks.map(ebookRow).join('')
        : `${emptyState('আপনার কেনা কোনো ই-বুক নেই।', 'book')}<p class="center mt-2"><a class="btn btn-accent btn-sm" href="/ebooks">Browse e-books</a></p>`}
    </section>

    <section class="dash-section" id="live-classes">
      <h2>${icon('calendar')} Live Classes</h2>
      ${d.live_classes.length || liveFallback ? d.live_classes.map(liveCard).join('') + liveFallback
        : emptyState(liveCourses.length ? 'Upcoming class information will appear here.' : 'You are not enrolled in any LIVE course.', 'calendar')}
    </section>

    <section class="dash-section" id="profile">
      <h2>${icon('user')} Profile</h2>
      <div class="card card-pad">
        <dl class="kv">
          <dt>Name</dt><dd>${esc(st.name)}</dd>
          <dt>Email</dt><dd>${esc(st.email)}</dd>
          <dt>Mobile</dt><dd>${esc(st.mobile || '—')}</dd>
          <dt>Joined</dt><dd>${fmtDate(st.joined_at)}</dd>
        </dl>
        <p class="small muted mt-2 mb-0">তথ্য পরিবর্তন করতে চাইলে <a href="/contact">আমাদের সাথে যোগাযোগ করুন</a>।</p>
      </div>
      ${d.payments.length ? `<h3 class="mt-4">Payment history</h3>
      <div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${d.payments.map((p) => `<tr><td>${esc(p.product_title)}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${fmtDate(p.created_at)}</td><td>${statusBadge(p.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </section>`;

  // Secure PDF download: ask the database for the file (checks purchase), then a 5-minute private link
  $$('[data-download]').forEach((btn) => btn.addEventListener('click', async () => {
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.textContent = 'Preparing…';
    try {
      const { data: f, error } = await sb.rpc('get_ebook_file', { p_ebook_id: btn.dataset.download });
      if (error) throw error;
      const { data: link, error: e2 } = await sb.storage.from('ebook-files').createSignedUrl(f.path, 300, { download: f.name || true });
      if (e2) throw e2;
      location.href = link.signedUrl;
    } catch (err) {
      if (isSessionError(err)) return sessionExpired();
      toast(/not_purchased/.test(err.message) ? 'This e-book is not active on your account.' : /file_not_uploaded/.test(err.message) ? 'The file has not been uploaded yet.' : errorText(err), 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }));

  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
