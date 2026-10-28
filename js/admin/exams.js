// Admin → Exams: create/edit exams (time, marks, pass mark, question mix,
// attempts per day, open/close) + email setup and email log.
import { adminInit, must, esc, icon, table, iconBtn, onActions, openForm, openInfo, toast, fmtDate, $, friendly, siteUrl } from '../admin.js';

const { sb, content } = await adminInit('exams', 'Exams');

let exams = [];
let topics = [];
let courses = [];
let pool = {}; // pool[topicId][difficulty] = active question count
const SETTING_KEYS = ['exam_email_from', 'exam_reply_to', 'exam_result_copy_to'];

const n = (v) => Number(v ?? 0);
const fmt = (v) => (Number.isInteger(n(v)) ? String(n(v)) : n(v).toFixed(2));

function available(e) {
  const sum = (d) => (e.topic_ids || []).reduce((s, t) => s + (pool[t]?.[d] || 0), 0);
  return { easy: sum('easy'), practical: sum('practical'), hard: sum('hard') };
}

async function load() {
  const [ex, tp, cs, qs] = await Promise.all([
    sb.from('exams').select('*').order('sort_order').order('created_at').then(must),
    sb.from('exam_topics').select('*').order('sort_order').order('id').then(must),
    sb.from('courses').select('id,title').order('sort_order').then(must),
    sb.from('exam_questions').select('topic_id,difficulty').eq('status', 'active').range(0, 9999).then(must),
  ]);
  exams = ex; topics = tp; courses = cs;
  pool = {};
  for (const q of qs) { pool[q.topic_id] ||= {}; pool[q.topic_id][q.difficulty] = (pool[q.topic_id][q.difficulty] || 0) + 1; }
  render();
}

function render() {
  $('#exam-list').innerHTML = table([
    ['Exam', (e) => `<b>${esc(e.title)}</b><small>/exam?exam=${esc(e.slug)}</small>`],
    ['Topics', (e) => `<span class="small">${(e.topic_ids || []).length === topics.length ? 'All topics' : (e.topic_ids || []).map((t) => esc(topics.find((x) => x.id === t)?.title.split(' — ')[0] || t)).join(', ')}</span>`],
    ['Questions (E / P / H)', (e) => {
      const a = available(e);
      const total = n(e.easy_count) + n(e.practical_count) + n(e.hard_count);
      const short = a.easy + a.practical + a.hard < total;
      const mixShort = a.easy < e.easy_count || a.practical < e.practical_count || a.hard < e.hard_count;
      return `<b>${total}</b> <span class="small">(${e.easy_count} / ${e.practical_count} / ${e.hard_count})</span>
        <small${short ? ' style="color:var(--danger)"' : ''}>Bank: ${a.easy} / ${a.practical} / ${a.hard}${short ? ' — not enough!' : mixShort ? ' — will fill from other levels' : ''}</small>`;
    }],
    ['Marks', (e) => `${fmt(e.total_marks)}<small>Pass ${fmt(e.pass_marks)}</small>`],
    ['Time', (e) => `${e.duration_minutes} min`],
    ['Per day', (e) => `${e.max_attempts_per_day}×`],
    ['Who', (e) => `<span class="small">${(e.course_ids || []).length ? (e.course_ids || []).map((c) => esc(courses.find((x) => x.id === c)?.title || 'deleted course')).join('<br>') : 'Any enrolled student'}</span>`],
    ['Status', (e) => (e.status === 'open' ? '<span class="badge badge-success">Open</span>' : '<span class="badge badge-muted">Closed</span>')],
  ], exams, {
    empty: 'No exams yet. Click "Add Exam".',
    actions: (e) => [
      `<a class="icon-btn" href="/exam?exam=${encodeURIComponent(e.slug)}" target="_blank" rel="noopener" title="Open exam page">${icon('eye')}</a>`,
      iconBtn('link', 'copy', 'Copy exam link'),
      iconBtn('toggle', e.status === 'open' ? 'lock' : 'globe', e.status === 'open' ? 'Close exam' : 'Open exam'),
      iconBtn('edit', 'edit', 'Edit'),
      iconBtn('delete', 'trash', 'Delete', true),
    ].join(''),
  });
}

const fields = () => [
  { name: 'title', label: 'Exam title', required: true, placeholder: 'e.g. Final Exam — সব কোর্স মিলিয়ে' },
  { name: 'slug', label: 'Link name (English, e.g. final-exam)', placeholder: 'auto from title' },
  { name: 'description', label: 'Short description (shown to students)', type: 'textarea', rows: 2 },
  { name: 'topic_ids', label: 'Questions come from these topics', type: 'checks', options: topics.map((t) => [t.id, t.title]) },
  { name: 'course_ids', label: 'Who can sit this exam (students enrolled in…)', type: 'checks', options: courses.map((c) => [c.id, c.title]), hint: 'কোনোটি টিক না দিলে যেকোনো কোর্সে ভর্তি হওয়া শিক্ষার্থী পরীক্ষা দিতে পারবে।' },
  { name: 'easy_count', label: 'Easy questions (জ্ঞানভিত্তিক)', type: 'number', required: true },
  { name: 'practical_count', label: 'Practical questions (প্রয়োগ/হিসাব)', type: 'number', required: true },
  { name: 'hard_count', label: 'Hard questions (একটু কঠিন)', type: 'number', required: true },
  { name: 'total_marks', label: 'Total marks', type: 'number', required: true, hint: 'প্রতি প্রশ্নের নম্বর = Total marks ÷ মোট প্রশ্ন।' },
  { name: 'pass_marks', label: 'Pass marks', type: 'number', required: true },
  { name: 'duration_minutes', label: 'Time (minutes)', type: 'number', required: true },
  { name: 'max_attempts_per_day', label: 'Max attempts per email per day', type: 'number', required: true },
  { name: 'status', label: 'Status', type: 'select', options: [['open', 'Open (students can take it)'], ['closed', 'Closed (hidden)']] },
  { name: 'sort_order', label: 'Order on exam page', type: 'number' },
];

function edit(row) {
  openForm({
    title: row ? `Edit: ${row.title}` : 'Add Exam',
    wide: true,
    fields: fields(),
    values: row || {
      topic_ids: topics.map((t) => t.id), course_ids: [], easy_count: 8, practical_count: 8, hard_count: 4,
      total_marks: 100, pass_marks: 75, duration_minutes: 40, max_attempts_per_day: 2, status: 'open', sort_order: exams.length + 1,
    },
    intro: '<div class="help">ডিফল্ট: ২০টি প্রশ্ন (Easy ৮, Practical ৮, Hard ৪), ১০০ নম্বর, পাশ ৭৫, ৪০ মিনিট, দিনে ২ বার। পরিবর্তন শুধু নতুন পরীক্ষার্থীদের ক্ষেত্রে প্রযোজ্য হবে — আগের ফলাফল বদলাবে না।</div>',
    onSubmit: async (v) => {
      v.slug = String(v.slug || v.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `exam-${Date.now()}`;
      v.topic_ids = v.topic_ids.map(Number);
      if (!v.topic_ids.length) throw new Error('অন্তত একটি টপিক বেছে নিন।');
      for (const k of ['easy_count', 'practical_count', 'hard_count', 'duration_minutes', 'max_attempts_per_day', 'sort_order']) v[k] = Math.round(n(v[k]));
      if (v.easy_count + v.practical_count + v.hard_count < 1) throw new Error('মোট প্রশ্ন অন্তত ১টি হতে হবে।');
      if (n(v.pass_marks) > n(v.total_marks)) throw new Error('Pass marks cannot be more than total marks.');
      if (row) must(await sb.from('exams').update(v).eq('id', row.id));
      else must(await sb.from('exams').insert(v));
      toast('Saved');
      await load();
    },
  });
}

// ---------------- Email setup ----------------
async function loadEmailSettings() {
  const rows = must(await sb.from('website_settings').select('key,value').in('key', SETTING_KEYS));
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value || '']));
  $('#em-from').value = s.exam_email_from || 'Accounting Career Academy <exam@accountingcareeracademy.com>';
  $('#em-reply').value = s.exam_reply_to || '';
  $('#em-copy').value = s.exam_result_copy_to || '';
}

async function showLog() {
  const rows = must(await sb.rpc('admin_exam_email_log', { p_limit: 60 }));
  const status = (r) => {
    if (r.error) return `<span class="badge badge-danger">Not sent</span><small>${esc(r.error)}</small>`;
    if (r.status_code == null) return '<span class="badge badge-warning">Sending…</span>';
    if (r.status_code >= 200 && r.status_code < 300) return '<span class="badge badge-success">Sent</span>';
    return `<span class="badge badge-danger">Error ${esc(r.status_code)}</span><small>${esc(r.response || '')}</small>`;
  };
  openInfo('Email log (latest 60)', table([
    ['Time', (r) => fmtDate(r.created_at, true)],
    ['Type', (r) => esc({ code: 'Exam code', result: 'Result', test: 'Test' }[r.kind] || r.kind)],
    ['To', (r) => esc(r.to_email)],
    ['Status', status],
  ], rows || [], { empty: 'No emails sent yet.' }) + '<p class="small muted mt-2">"Sending…" usually changes within a minute. Supabase keeps delivery replies for about 6 hours.</p>', { wide: true });
}

content.innerHTML = `
  <div class="toolbar">
    <div class="left"><span class="small muted">Students take exams at <a href="/exam" target="_blank" rel="noopener"><b>${esc(siteUrl())}/exam</b></a></span></div>
    <button class="btn btn-primary" type="button" id="add">${icon('plus')} Add Exam</button>
  </div>
  <div id="exam-list"><div class="skeleton" style="min-height:200px"></div></div>

  <section class="panel" style="margin-top:28px">
    <div class="panel-head"><h2>${icon('mail')} Email setup (exam code &amp; result)</h2></div>
    <div class="panel-body">
      <div class="help" style="margin-bottom:14px">ইমেইল যায় <b>Resend</b> দিয়ে। Resend-এর API key Supabase <b>Vault</b>-এ <code>resend_api_key</code> নামে রাখতে হয় (README → Online Exam দেখুন)। নিচের "From" ঠিকানার ডোমেইন Resend-এ Verified হতে হবে।</div>
      <form id="em-form" class="settings-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
        <div class="field"><label for="em-from">From (sender)</label><input class="input" id="em-from" required></div>
        <div class="field"><label for="em-reply">Reply-to (optional)</label><input class="input" id="em-reply" type="email" placeholder="your@gmail.com"></div>
        <div class="field"><label for="em-copy">Send me a copy of every result (optional)</label><input class="input" id="em-copy" type="email" placeholder="your@gmail.com"></div>
      </form>
      <div class="btn-row mt-2">
        <button class="btn btn-primary btn-sm" type="button" id="em-save">Save</button>
        <button class="btn btn-light btn-sm" type="button" id="em-test">${icon('mail')} Send test email</button>
        <button class="btn btn-ghost btn-sm" type="button" id="em-log">${icon('list')} Email log</button>
      </div>
    </div>
  </section>`;

$('#add').addEventListener('click', () => edit(null));
$('#em-save').addEventListener('click', async (e) => {
  e.target.disabled = true;
  try {
    const from = $('#em-from').value.trim();
    if (!/@/.test(from)) throw new Error('From must contain an email address, e.g. Accounting Career Academy <exam@accountingcareeracademy.com>');
    must(await sb.from('website_settings').upsert([
      { key: 'exam_email_from', value: from },
      { key: 'exam_reply_to', value: $('#em-reply').value.trim() },
      { key: 'exam_result_copy_to', value: $('#em-copy').value.trim() },
    ], { onConflict: 'key' }));
    toast('Email settings saved');
  } catch (err) { toast(friendly(err), 'error', 6000); }
  e.target.disabled = false;
});
$('#em-test').addEventListener('click', async (e) => {
  const to = prompt('Send a test email to:', $('#em-copy').value.trim() || '');
  if (!to) return;
  e.target.disabled = true;
  try {
    const r = must(await sb.rpc('admin_exam_test_email', { p_to: to }));
    if (r.ok) toast('Test email sent. Check the inbox (and Spam). Open "Email log" in a minute to see the delivery status.', 'info', 7000);
    else toast('Not sent: ' + r.error, 'error', 8000);
  } catch (err) { toast(friendly(err), 'error', 6000); }
  e.target.disabled = false;
});
$('#em-log').addEventListener('click', () => showLog().catch((err) => toast(friendly(err), 'error', 6000)));

onActions(content, () => exams, {
  edit: (r) => edit(r),
  link: async (r) => {
    const url = `${siteUrl()}/exam?exam=${encodeURIComponent(r.slug)}`;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link:', url); }
  },
  toggle: async (r) => {
    must(await sb.from('exams').update({ status: r.status === 'open' ? 'closed' : 'open' }).eq('id', r.id));
    toast(r.status === 'open' ? 'Exam closed' : 'Exam opened');
    await load();
  },
  delete: async (r) => {
    if (!confirm(`Delete exam "${r.title}"?\n\nPast results stay in Exam Results. This cannot be undone.`)) return;
    must(await sb.from('exams').delete().eq('id', r.id));
    toast('Deleted');
    await load();
  },
});

load().catch((err) => { $('#exam-list').innerHTML = `<div class="alert alert-error">${esc(friendly(err))} — Did you run <b>supabase/exam-update.sql</b>?</div>`; });
loadEmailSettings().catch(() => {});
