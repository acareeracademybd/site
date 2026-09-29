// Admin → Modules / Lessons (also FAQs and Live class links for each course)
import { adminInit, must, esc, icon, iconBtn, btn, openForm, toast, reorder, table, onActions, uploadPrivate, fmtDate, $ } from '../admin.js';

const { sb, content } = await adminInit('lessons', 'Modules / Lessons');

let courses = [];
let course = null;
let modules = [];
let lessons = [];
let faqs = [];
let lives = [];

const LESSON_HELP = `Video link: paste a <b>YouTube</b> (use "Unlisted" videos for paid lessons), <b>Vimeo</b>, <b>Google Drive</b> (file shared as "Anyone with the link") or a direct <b>.mp4</b> link.`;

async function init() {
  courses = must(await sb.from('courses').select('id,title,course_type,slug,status').order('sort_order').order('created_at', { ascending: false }));
  if (!courses.length) {
    content.innerHTML = `<div class="empty">${icon('info')}<p>First create a course in <a href="/admin/courses">Courses</a>.</p></div>`;
    return;
  }
  const wanted = new URLSearchParams(location.search).get('course');
  course = courses.find((c) => c.id === wanted) || courses[0];
  content.innerHTML = `
    <div class="toolbar">
      <div class="left">
        <label class="label" for="course-pick">Course:</label>
        <select class="select" id="course-pick">${courses.map((c) => `<option value="${esc(c.id)}"${c.id === course.id ? ' selected' : ''}>${esc(c.title)} (${c.course_type.toUpperCase()}${c.status === 'draft' ? ', draft' : ''})</option>`).join('')}</select>
      </div>
      <a class="btn btn-ghost btn-sm" id="view-course" target="_blank" rel="noopener">${icon('eye')} View course page</a>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>${icon('list')} Modules & Lessons</h2>${btn('add-module', 'Add Module', 'plus', 'btn-primary')}</div>
      <div class="panel-body" id="modules-box"></div>
    </div>
    <div class="panel" id="live-panel">
      <div class="panel-head"><h2>${icon('video')} Live classes (shown only to enrolled students)</h2>${btn('add-live', 'Add Live Class', 'plus', 'btn-light')}</div>
      <div class="panel-body" id="live-box"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>${icon('info')} FAQ</h2>${btn('add-faq', 'Add FAQ', 'plus', 'btn-light')}</div>
      <div class="panel-body" id="faq-box"></div>
    </div>`;
  $('#course-pick').addEventListener('change', (e) => {
    course = courses.find((c) => c.id === e.target.value);
    history.replaceState(null, '', '?course=' + course.id);
    load();
  });
  await load();
}

async function load() {
  $('#view-course').href = `/course/${course.slug}`;
  [modules, lessons, faqs, lives] = await Promise.all([
    sb.from('course_modules').select('*').eq('course_id', course.id).order('sort_order').order('created_at').then(must),
    sb.from('lessons').select('*').eq('course_id', course.id).order('sort_order').order('created_at').then(must),
    sb.from('course_faqs').select('*').eq('course_id', course.id).order('sort_order').then(must),
    sb.from('live_classes').select('*').eq('course_id', course.id).order('class_date', { ascending: true, nullsFirst: false }).then(must),
  ]);
  renderModules();
  $('#faq-box').innerHTML = table([['Question', (f) => `<b>${esc(f.question)}</b><small>${esc(f.answer)}</small>`]], faqs, {
    empty: 'No FAQ yet.',
    actions: (f, i) => iconBtn('faq-up', 'up', 'Move up', false, i === 0) + iconBtn('faq-down', 'down', 'Move down', false, i === faqs.length - 1) + iconBtn('faq-edit', 'edit', 'Edit') + iconBtn('faq-del', 'trash', 'Delete', true),
  });
  $('#live-panel').hidden = course.course_type !== 'live' && !lives.length;
  $('#live-box').innerHTML = table([
    ['Class', (l) => `<b>${esc(l.title)}</b><small>${esc(l.platform || '')}</small>`],
    ['Date & time', (l) => `${l.class_date ? fmtDate(l.class_date) : '—'}<small>${esc(l.start_time || '')}</small>`],
    ['Meeting', (l) => l.meeting_link ? `<a href="${esc(l.meeting_link)}" target="_blank" rel="noopener">Link</a><small>${esc(l.meeting_id || '')}</small>` : '—'],
  ], lives, { empty: 'No live classes added. Add the class date, time and Zoom/Meet link here — only enrolled students can see them.', actions: () => iconBtn('live-edit', 'edit', 'Edit') + iconBtn('live-del', 'trash', 'Delete', true) });
}

function renderModules() {
  const box = $('#modules-box');
  if (!modules.length) { box.innerHTML = `<div class="empty">${icon('info')}<p class="mb-0">No modules yet. Click <b>Add Module</b> (e.g. "Module 1: Accounting Basics"), then add lessons inside it.</p></div>`; return; }
  box.innerHTML = modules.map((m, mi) => {
    const ls = lessons.filter((l) => l.module_id === m.id);
    return `<div class="module-block" data-module="${mi}">
      <div class="module-head">
        <h3>${mi + 1}. ${esc(m.title)}</h3>
        ${iconBtn('mod-up', 'up', 'Move module up', false, mi === 0)}${iconBtn('mod-down', 'down', 'Move module down', false, mi === modules.length - 1)}
        ${iconBtn('mod-edit', 'edit', 'Edit module')}${iconBtn('mod-del', 'trash', 'Delete module', true)}
        ${btn('add-lesson', 'Add Lesson', 'plus', 'btn-light')}
      </div>
      ${ls.length ? ls.map((l, li) => `<div class="lesson-row" data-lesson="${esc(l.id)}">
          <span class="t"><b>${esc(l.title)}</b>
            <small>${[l.duration, l.video_url ? '🎬 video' : '⚠️ no video', l.material_path ? '📎 ' + esc(l.material_name || 'file') : '', l.drip_days ? `unlocks after ${l.drip_days} days` : ''].filter(Boolean).join(' · ')}</small></span>
          ${l.is_free ? '<span class="badge badge-success">Free preview</span>' : '<span class="badge badge-muted">Paid</span>'}
          ${iconBtn('les-up', 'up', 'Move up', false, li === 0)}${iconBtn('les-down', 'down', 'Move down', false, li === ls.length - 1)}
          <span class="icon-btn file-btn" title="Upload material (PDF, Excel…)">${icon('download')}<input type="file" data-material="${esc(l.id)}" aria-label="Upload material"></span>
          ${l.material_path ? iconBtn('les-unfile', 'x', 'Remove material') : ''}
          ${iconBtn('les-edit', 'edit', 'Edit lesson')}${iconBtn('les-del', 'trash', 'Delete lesson', true)}
        </div>`).join('') : '<p class="small muted" style="padding:12px 16px;margin:0">No lessons in this module yet.</p>'}
    </div>`;
  }).join('');
}

const moduleFields = [
  { name: 'title', label: 'Module title', required: true, full: true, placeholder: 'e.g. Module 1: Accounting Foundation' },
  { name: 'description', label: 'Short description (optional)', type: 'textarea', rows: 2 },
];
const lessonFields = () => [
  { name: 'title', label: 'Lesson title', required: true, full: true },
  { name: 'module_id', label: 'Module', type: 'select', options: modules.map((m) => [m.id, m.title]) },
  { name: 'duration', label: 'Duration', placeholder: 'e.g. 25 min' },
  { name: 'video_url', label: 'Video URL', full: true, hint: LESSON_HELP, placeholder: 'https://youtu.be/...' },
  { name: 'description', label: 'Lesson description / notes', type: 'rich', rows: 5 },
  { name: 'is_free', label: 'Free preview (anyone can watch this lesson on the course page)', type: 'checkbox', full: true },
  { name: 'drip_days', label: 'Unlock after N days from enrolment (0 = immediately)', type: 'number', default: 0 },
];
const faqFields = [
  { name: 'question', label: 'Question', required: true, full: true },
  { name: 'answer', label: 'Answer', type: 'textarea', required: true, rows: 3 },
];
const liveFields = [
  { name: 'title', label: 'Class title', required: true, full: true, placeholder: 'e.g. Class 5 — Bank Reconciliation' },
  { name: 'class_date', label: 'Date', type: 'date' },
  { name: 'start_time', label: 'Time', placeholder: '8:00 PM' },
  { name: 'platform', label: 'Platform', placeholder: 'Zoom / Google Meet' },
  { name: 'meeting_link', label: 'Meeting link (private)', type: 'url', full: true, placeholder: 'https://zoom.us/j/...' },
  { name: 'meeting_id', label: 'Meeting ID' },
  { name: 'passcode', label: 'Passcode' },
  { name: 'notes', label: 'Notes for students', type: 'textarea', rows: 2 },
];

const moduleOf = (btnEl) => modules[Number(btnEl.closest('[data-module]').dataset.module)];
const lessonOf = (btnEl) => lessons.find((l) => l.id === btnEl.closest('[data-lesson]').dataset.lesson);
const siblings = (l) => lessons.filter((x) => x.module_id === l.module_id);

onActions(content, (b) => (b.closest('#faq-box') ? faqs : b.closest('#live-box') ? lives : []), {
  'add-module': () => openForm({ title: 'Add Module', fields: moduleFields, onSubmit: async (v) => {
    must(await sb.from('course_modules').insert({ ...v, course_id: course.id, sort_order: modules.length + 1 })); toast('Module added'); await load(); } }),
  'mod-edit': (_, __, b) => { const m = moduleOf(b); openForm({ title: 'Edit Module', fields: moduleFields, values: m, onSubmit: async (v) => { must(await sb.from('course_modules').update(v).eq('id', m.id)); toast('Saved'); await load(); } }); },
  'mod-del': async (_, __, b) => {
    const m = moduleOf(b);
    if (!confirm(`Delete module "${m.title}" and ALL its lessons?`)) return;
    must(await sb.from('course_modules').delete().eq('id', m.id)); toast('Deleted'); await load();
  },
  'mod-up': async (_, __, b) => { await reorder('course_modules', modules, modules.indexOf(moduleOf(b)), -1); await load(); },
  'mod-down': async (_, __, b) => { await reorder('course_modules', modules, modules.indexOf(moduleOf(b)), 1); await load(); },
  'add-lesson': (_, __, b) => { const m = moduleOf(b); openForm({ title: `Add Lesson — ${m.title}`, wide: true, fields: lessonFields(), values: { module_id: m.id, drip_days: 0 }, onSubmit: async (v) => {
    v.drip_days = Math.max(0, Math.round(v.drip_days || 0));
    must(await sb.from('lessons').insert({ ...v, course_id: course.id, sort_order: lessons.filter((l) => l.module_id === v.module_id).length + 1 })); toast('Lesson added'); await load(); } }); },
  'les-edit': (_, __, b) => { const l = lessonOf(b); openForm({ title: 'Edit Lesson', wide: true, fields: lessonFields(), values: l, onSubmit: async (v) => {
    v.drip_days = Math.max(0, Math.round(v.drip_days || 0));
    must(await sb.from('lessons').update(v).eq('id', l.id)); toast('Saved'); await load(); } }); },
  'les-del': async (_, __, b) => {
    const l = lessonOf(b);
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    if (l.material_path) await sb.storage.from('course-files').remove([l.material_path]);
    must(await sb.from('lessons').delete().eq('id', l.id)); toast('Deleted'); await load();
  },
  'les-up': async (_, __, b) => { const l = lessonOf(b); const s = siblings(l); await reorder('lessons', s, s.indexOf(l), -1); await load(); },
  'les-down': async (_, __, b) => { const l = lessonOf(b); const s = siblings(l); await reorder('lessons', s, s.indexOf(l), 1); await load(); },
  'les-unfile': async (_, __, b) => {
    const l = lessonOf(b);
    if (!confirm('Remove the downloadable file from this lesson?')) return;
    await sb.storage.from('course-files').remove([l.material_path]);
    must(await sb.from('lessons').update({ material_path: null, material_name: null }).eq('id', l.id)); toast('File removed'); await load();
  },
  'add-faq': () => openForm({ title: 'Add FAQ', fields: faqFields, onSubmit: async (v) => { must(await sb.from('course_faqs').insert({ ...v, course_id: course.id, sort_order: faqs.length + 1 })); toast('Saved'); await load(); } }),
  'faq-edit': (f) => openForm({ title: 'Edit FAQ', fields: faqFields, values: f, onSubmit: async (v) => { must(await sb.from('course_faqs').update(v).eq('id', f.id)); toast('Saved'); await load(); } }),
  'faq-del': async (f) => { if (!confirm('Delete this FAQ?')) return; must(await sb.from('course_faqs').delete().eq('id', f.id)); await load(); },
  'faq-up': async (f) => { await reorder('course_faqs', faqs, faqs.indexOf(f), -1); await load(); },
  'faq-down': async (f) => { await reorder('course_faqs', faqs, faqs.indexOf(f), 1); await load(); },
  'add-live': () => openForm({ title: 'Add Live Class', fields: liveFields, values: { platform: 'Zoom' }, onSubmit: async (v) => { must(await sb.from('live_classes').insert({ ...v, course_id: course.id })); toast('Saved'); await load(); } }),
  'live-edit': (l) => openForm({ title: 'Edit Live Class', fields: liveFields, values: l, onSubmit: async (v) => { must(await sb.from('live_classes').update(v).eq('id', l.id)); toast('Saved'); await load(); } }),
  'live-del': async (l) => { if (!confirm(`Delete "${l.title}"?`)) return; must(await sb.from('live_classes').delete().eq('id', l.id)); await load(); },
});

// Material upload
content.addEventListener('change', async (e) => {
  const inp = e.target.closest('input[data-material]');
  if (!inp || !inp.files[0]) return;
  const l = lessons.find((x) => x.id === inp.dataset.material);
  const file = inp.files[0];
  toast('Uploading ' + file.name + '…', 'info', 60000);
  try {
    const path = await uploadPrivate('course-files', course.id, file);
    if (l.material_path) await sb.storage.from('course-files').remove([l.material_path]);
    must(await sb.from('lessons').update({ material_path: path, material_name: file.name }).eq('id', l.id));
    toast('File uploaded — only enrolled students can download it');
    await load();
  } catch (err) { toast(err.message, 'error', 6000); }
});

await init();
