// Course player: Course → Module → Lesson (video, description, downloadable material)
import { initLayout } from './settings.js';
import { requireStudent, sessionExpired, isSessionError } from './auth.js';
import { $, esc, icon, param, richText, videoEmbedHtml, fmtDate, emptyState, toast, errorText, setMeta } from './utils.js';

const root = $('#learn-root');
let sb, data, flat = [], done = new Set(), current;

function lessonUrl(id) {
  return `/learn?course=${encodeURIComponent(data.course.slug)}&lesson=${encodeURIComponent(id)}`;
}

function outlineHtml() {
  const total = flat.length;
  const pct = total ? Math.round((done.size / total) * 100) : 0;
  return `<div class="card outline">
    <div class="outline-head">
      <h2>${esc(data.course.title)}</h2>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="small muted mt-1">${done.size}/${total} completed · ${pct}%</div>
    </div>
    <div class="accordion" style="border:0;border-radius:0">
      ${data.modules.map((m) => `
        <details${m.lessons.some((l) => l.id === current?.id) ? ' open' : ''}>
          <summary><span>${esc(m.title)}</span><small>${m.lessons.length}</small></summary>
          <div class="acc-body">
            ${m.lessons.map((l) => `
              <a class="outline-lesson" href="${lessonUrl(l.id)}" data-lesson="${esc(l.id)}"${l.id === current?.id ? ' aria-current="true"' : ''}>
                <span class="st${done.has(l.id) ? ' done' : ''}${l.locked ? ' locked' : ''}">${done.has(l.id) ? icon('check') : l.locked ? icon('lock', 'ico') : ''}</span>
                <span>${esc(l.title)}</span><span class="dur">${esc(l.duration || '')}</span>
              </a>`).join('')}
          </div>
        </details>`).join('')}
    </div>
  </div>`;
}

function playerHtml(l) {
  if (l.locked) return `<div class="player-video"><div class="pv-msg">${icon('lock')}<p>This lesson unlocks on <b>${fmtDate(l.unlocks_at)}</b>.</p></div></div>`;
  const embed = videoEmbedHtml(l.video_url, l.title, false);
  if (embed) return `<div class="player-video">${embed}</div>`;
  return `<div class="player-video"><div class="pv-msg">${icon('video')}<p class="mb-0">ভিডিওটি শীঘ্রই যোগ করা হবে।</p></div></div>`;
}

function render() {
  const idx = flat.findIndex((l) => l.id === current.id);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const isDone = done.has(current.id);
  setMeta(`${current.title} — ${data.course.title}`);
  root.innerHTML = `
    <nav class="crumbs" style="margin-top:20px" aria-label="Breadcrumb"><a href="/dashboard">Dashboard</a> / <a href="/dashboard#my-courses">My Courses</a> / ${esc(data.course.title)}</nav>
    <div class="player-grid" style="padding-top:8px">
      <div>
        ${playerHtml(current)}
        <div class="lesson-head">
          <div><div class="small muted">${esc(current.moduleTitle)}</div><h1>${esc(current.title)}</h1></div>
          ${current.locked ? '' : `<button class="btn ${isDone ? 'btn-light' : 'btn-primary'} btn-sm" type="button" id="mark-btn">${icon('check')} ${isDone ? 'Completed' : 'Mark as complete'}</button>`}
        </div>
        ${current.description ? `<div class="prose">${richText(current.description)}</div>` : ''}
        ${current.has_material && !current.locked ? `<div class="card list-card mt-2"><span class="ico-wrap" style="color:var(--navy)">${icon('file')}</span>
          <div class="lc-body"><h3>Lesson material</h3><div class="small muted">${esc(current.material_name || 'Download file')}</div></div>
          <button class="btn btn-accent btn-sm" type="button" id="material-btn">${icon('download')} Download</button></div>` : ''}
        <div class="lesson-nav">
          ${prev ? `<a class="btn btn-ghost" href="${lessonUrl(prev.id)}" data-lesson="${esc(prev.id)}">${icon('arrow-left')} Previous</a>` : '<span></span>'}
          ${next ? `<a class="btn btn-primary" href="${lessonUrl(next.id)}" data-lesson="${esc(next.id)}">Next ${icon('arrow-right')}</a>` : '<a class="btn btn-ghost" href="/dashboard">Back to dashboard</a>'}
        </div>
      </div>
      <aside>${outlineHtml()}</aside>
    </div>`;

  $('#mark-btn')?.addEventListener('click', toggleDone);
  $('#material-btn')?.addEventListener('click', downloadMaterial);
}

function go(id, push = true) {
  const l = flat.find((x) => x.id === id);
  if (!l) return;
  current = l;
  if (push) history.pushState({ id }, '', lessonUrl(id));
  render();
  window.scrollTo({ top: 0 });
}

async function toggleDone() {
  const btn = $('#mark-btn');
  btn.disabled = true;
  const want = !done.has(current.id);
  const { error } = await sb.rpc('mark_lesson', { p_lesson_id: current.id, p_done: want });
  if (error) { btn.disabled = false; if (isSessionError(error)) return sessionExpired(); return toast(errorText(error), 'error'); }
  want ? done.add(current.id) : done.delete(current.id);
  const idx = flat.findIndex((l) => l.id === current.id);
  if (want && flat[idx + 1] && !flat[idx + 1].locked) { toast('Lesson completed ✓'); }
  render();
}

async function downloadMaterial() {
  const btn = $('#material-btn');
  btn.disabled = true;
  try {
    const { data: f, error } = await sb.rpc('get_lesson_material', { p_lesson_id: current.id });
    if (error) throw error;
    const { data: link, error: e2 } = await sb.storage.from('course-files').createSignedUrl(f.path, 300, { download: f.name || true });
    if (e2) throw e2;
    location.href = link.signedUrl;
  } catch (err) {
    if (isSessionError(err)) return sessionExpired();
    toast(/locked/.test(err.message) ? 'This lesson is not unlocked yet.' : errorText(err), 'error');
  } finally { btn.disabled = false; }
}

(async () => {
  initLayout();
  sb = await requireStudent();
  if (!sb) return;
  const slug = param('course');
  if (!slug) { location.replace('/dashboard'); return; }
  const res = await sb.rpc('student_course', { p_slug: slug });
  if (res.error) {
    if (isSessionError(res.error)) return sessionExpired();
    root.innerHTML = `<div style="padding:48px 0">${emptyState(/not_enrolled/.test(res.error.message)
      ? 'আপনি এই কোর্সে ভর্তি নন অথবা আপনার এক্সেসের মেয়াদ শেষ হয়েছে।' : errorText(res.error))}
      <p class="center mt-3"><a class="btn btn-primary" href="/dashboard">Go to Dashboard</a></p></div>`;
    return;
  }
  data = res.data;
  data.modules.forEach((m) => m.lessons.forEach((l) => flat.push({ ...l, moduleTitle: m.title })));
  done = new Set(data.completed || []);
  if (!flat.length) { root.innerHTML = `<div style="padding:48px 0">${emptyState('এই কোর্সের লেসন শীঘ্রই যোগ করা হবে।')}</div>`; return; }
  const wanted = param('lesson');
  current = flat.find((l) => l.id === wanted) || flat.find((l) => !done.has(l.id) && !l.locked) || flat[0];
  history.replaceState({ id: current.id }, '', lessonUrl(current.id));
  render();

  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-lesson]');
    if (!a || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    go(a.dataset.lesson);
  });
  window.addEventListener('popstate', (e) => { if (e.state?.id) go(e.state.id, false); });
})();
