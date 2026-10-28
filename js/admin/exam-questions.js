// Admin → Question Bank: add / edit / turn off questions, filter by topic and level,
// import many questions from a CSV (Excel → Save As → CSV UTF-8) and export to CSV.
import { adminInit, must, esc, icon, table, iconBtn, onActions, openForm, openInfo, toast, $, friendly } from '../admin.js';

const { sb, content } = await adminInit('exam-questions', 'Question Bank');

const LEVELS = [['easy', 'Easy (জ্ঞানভিত্তিক)'], ['practical', 'Practical (প্রয়োগ/হিসাব)'], ['hard', 'Hard (একটু কঠিন)']];
const LEVEL_BADGE = { easy: '<span class="badge badge-success">Easy</span>', practical: '<span class="badge">Practical</span>', hard: '<span class="badge badge-warning">Hard</span>' };
const LETTER = { a: 'ক', b: 'খ', c: 'গ', d: 'ঘ' };

let questions = [];
let topics = [];
const filter = { q: '', topic: '', level: '', status: '' };

async function load() {
  [questions, topics] = await Promise.all([
    sb.from('exam_questions').select('*').order('topic_id').order('ref_no', { ascending: true, nullsFirst: false }).order('created_at').range(0, 9999).then(must),
    sb.from('exam_topics').select('*').order('sort_order').order('id').then(must),
  ]);
  $('#f-topic').innerHTML = '<option value="">All topics</option>' + topics.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
  $('#f-topic').value = filter.topic;
  render();
}

const visible = () => questions.filter((x) =>
  (!filter.topic || String(x.topic_id) === filter.topic) &&
  (!filter.level || x.difficulty === filter.level) &&
  (!filter.status || x.status === filter.status) &&
  (!filter.q || [x.question, x.option_a, x.option_b, x.option_c, x.option_d, x.ref_no].some((v) => String(v ?? '').toLowerCase().includes(filter.q))));

function summary() {
  const act = questions.filter((x) => x.status === 'active');
  const c = (d) => act.filter((x) => x.difficulty === d).length;
  return `<div class="tile-grid">
    <div class="tile"><span>Active questions</span><b>${act.length}</b></div>
    <div class="tile"><span>Easy</span><b>${c('easy')}</b></div>
    <div class="tile"><span>Practical</span><b>${c('practical')}</b></div>
    <div class="tile"><span>Hard</span><b>${c('hard')}</b></div>
  </div>`;
}

function render() {
  const list = visible();
  $('#summary').innerHTML = summary();
  $('#count').textContent = `${list.length} of ${questions.length}`;
  $('#list').innerHTML = table([
    ['#', (x) => esc(x.ref_no ?? '—')],
    ['Question', (x) => `<span style="display:block;max-width:520px">${esc(x.question)}</span><small>✔ ${LETTER[x.correct]}) ${esc(x['option_' + x.correct])}</small>`],
    ['Topic', (x) => `<span class="small">${esc(topics.find((t) => t.id === x.topic_id)?.title || x.topic_id)}</span>`],
    ['Level', (x) => LEVEL_BADGE[x.difficulty] || esc(x.difficulty)],
    ['Status', (x) => (x.status === 'active' ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-muted">Off</span>')],
  ], list, {
    empty: questions.length ? 'No questions match the filter.' : 'No questions yet. Run supabase/exam-questions.sql, or click "Add Question" / "Import CSV".',
    actions: (x) => iconBtn('toggle', x.status === 'active' ? 'lock' : 'globe', x.status === 'active' ? 'Turn off (not used in exams)' : 'Turn on') + iconBtn('edit', 'edit', 'Edit') + iconBtn('delete', 'trash', 'Delete', true),
  });
}

const fields = () => [
  { name: 'topic_id', label: 'Topic', type: 'select', options: topics.map((t) => [t.id, t.title]) },
  { name: 'difficulty', label: 'Level', type: 'select', options: LEVELS },
  { name: 'question', label: 'Question', type: 'textarea', rows: 3, required: true },
  { name: 'option_a', label: 'ক) Option A', required: true },
  { name: 'option_b', label: 'খ) Option B', required: true },
  { name: 'option_c', label: 'গ) Option C', required: true },
  { name: 'option_d', label: 'ঘ) Option D', required: true },
  { name: 'correct', label: 'Correct answer', type: 'select', options: [['a', 'ক) A'], ['b', 'খ) B'], ['c', 'গ) C'], ['d', 'ঘ) D']] },
  { name: 'status', label: 'Status', type: 'select', options: [['active', 'Active (used in exams)'], ['inactive', 'Off (not used)']] },
  { name: 'explanation', label: 'Note / explanation (only for you)', type: 'textarea', rows: 2 },
];

function edit(row) {
  openForm({
    title: row ? `Edit question${row.ref_no ? ' #' + row.ref_no : ''}` : 'Add Question',
    wide: true,
    fields: fields(),
    values: row || { topic_id: filter.topic || topics[0]?.id, difficulty: filter.level || 'easy', correct: 'a', status: 'active' },
    intro: '<div class="help">অপশনগুলো যেকোনো ক্রমে লিখুন — পরীক্ষায় প্রত্যেকের জন্য অপশনের ক্রম আপনা-আপনি এলোমেলো হবে। "ক/খ উভয়ই" ধরনের অপশন দেবেন না, কারণ ক্রম বদলে যায়।</div>',
    onSubmit: async (v) => {
      v.topic_id = Number(v.topic_id);
      const opts = [v.option_a, v.option_b, v.option_c, v.option_d].map((o) => o.toLowerCase());
      if (new Set(opts).size < 4) throw new Error('চারটি অপশন আলাদা হতে হবে।');
      if (row) must(await sb.from('exam_questions').update(v).eq('id', row.id));
      else must(await sb.from('exam_questions').insert(v));
      toast('Saved');
      await load();
    },
  });
}

// ---------------- CSV ----------------
const CSV_HEAD = ['topic', 'level', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'status'];

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i += 1; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportCsv() {
  const lines = [CSV_HEAD.join(',')].concat(visible().map((x) => [x.topic_id, x.difficulty, x.question, x.option_a, x.option_b, x.option_c, x.option_d, x.correct, x.status].map(csvCell).join(',')));
  download(`question-bank-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\r\n'));
}

function readLetter(v) {
  const s = String(v || '').trim().toLowerCase();
  return { a: 'a', b: 'b', c: 'c', d: 'd', ক: 'a', খ: 'b', গ: 'c', ঘ: 'd', 1: 'a', 2: 'b', 3: 'c', 4: 'd' }[s.replace(/[)\s.]/g, '')] || null;
}
function readLevel(v) {
  const s = String(v || '').trim().toLowerCase();
  if (/^e|সহজ|জ্ঞান/.test(s)) return 'easy';
  if (/^p|প্রয়োগ|ব্যবহারিক/.test(s)) return 'practical';
  if (/^h|কঠিন/.test(s)) return 'hard';
  return null;
}
function readTopic(v) {
  const s = String(v || '').trim();
  const digits = s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).match(/\d+/);
  if (digits && topics.some((t) => t.id === Number(digits[0]))) return Number(digits[0]);
  return topics.find((t) => t.title.toLowerCase() === s.toLowerCase())?.id ?? null;
}

function importDialog() {
  const dlg = openInfo('Import questions from CSV', `
    <p>Excel-এ নিচের কলামগুলো দিয়ে শিট বানান, তারপর <b>File → Save As → CSV UTF-8</b> করে এখানে দিন:</p>
    <div class="table-wrap"><table class="table"><thead><tr>${CSV_HEAD.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody><tr><td>1</td><td>easy</td><td>GRN-এর পূর্ণরূপ কোনটি?</td><td>…</td><td>…</td><td>…</td><td>…</td><td>b</td><td>active</td></tr></tbody></table></div>
    <ul class="small">
      <li><b>topic</b>: টপিক নম্বর (1–${topics.length}) — ${topics.map((t) => `${t.id} = ${esc(t.title.split(' — ')[1] || t.title)}`).join(', ')}</li>
      <li><b>level</b>: easy / practical / hard &nbsp; · &nbsp; <b>correct</b>: a / b / c / d (বা ক / খ / গ / ঘ) &nbsp; · &nbsp; <b>status</b> খালি রাখলে active</li>
      <li>একই প্রশ্ন আগে থেকে থাকলে সেটি আবার যোগ হবে না।</li>
    </ul>
    <div class="btn-row"><button type="button" class="btn btn-light btn-sm" data-template>${icon('download')} Download template</button>
      <span class="btn btn-primary btn-sm file-btn">${icon('plus')} <span class="lbl">Choose CSV file</span><input type="file" accept=".csv,text/csv" data-file></span></div>
    <div data-out class="mt-2"></div>`, { wide: true });

  $('[data-template]', dlg).addEventListener('click', () => download('question-template.csv', [CSV_HEAD.join(','),
    ['1', 'easy', 'GRN-এর পূর্ণরূপ কোনটি?', 'Goods Return Note', 'Goods Received Note', 'General Receipt Note', 'Goods Record Number', 'b', 'active'].map(csvCell).join(',')].join('\r\n')));

  $('[data-file]', dlg).addEventListener('change', async (e) => {
    const out = $('[data-out]', dlg);
    const file = e.target.files[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    let start = 0;
    if (rows[0] && rows[0].some((c) => /question|option|topic/i.test(c))) start = 1;
    const errors = []; const good = [];
    const existing = new Set(questions.map((x) => x.question.trim().toLowerCase()));
    rows.slice(start).forEach((r, i) => {
      const line = i + start + 1;
      const [tp, lv, qn, a, b, c, d, cr, st] = r.map((x) => String(x ?? '').trim());
      const rec = { topic_id: readTopic(tp), difficulty: readLevel(lv), question: qn, option_a: a, option_b: b, option_c: c, option_d: d, correct: readLetter(cr), status: /^(off|inactive|no|0)$/i.test(st || '') ? 'inactive' : 'active' };
      const why = [];
      if (!rec.topic_id) why.push('topic');
      if (!rec.difficulty) why.push('level');
      if (!qn) why.push('question');
      if (![a, b, c, d].every(Boolean)) why.push('4 options');
      if (!rec.correct) why.push('correct');
      if (why.length) errors.push(`Line ${line}: check ${why.join(', ')}`);
      else if (existing.has(qn.toLowerCase())) errors.push(`Line ${line}: already in the bank — skipped`);
      else { existing.add(qn.toLowerCase()); good.push(rec); }
    });
    out.innerHTML = `<div class="alert alert-info">${good.length} new question(s) ready${errors.length ? `, ${errors.length} line(s) skipped` : ''}.</div>
      ${errors.length ? `<details class="mt-1"><summary class="small">Show skipped lines</summary><pre class="small" style="white-space:pre-wrap">${esc(errors.join('\n'))}</pre></details>` : ''}
      ${good.length ? `<button type="button" class="btn btn-primary mt-2" data-go>Import ${good.length} question(s)</button>` : ''}`;
    $('[data-go]', out)?.addEventListener('click', async (ev) => {
      ev.target.disabled = true; ev.target.textContent = 'Importing…';
      try {
        for (let k = 0; k < good.length; k += 200) must(await sb.from('exam_questions').insert(good.slice(k, k + 200)));
        toast(`${good.length} question(s) imported`);
        dlg.close();
        await load();
      } catch (err) { out.insertAdjacentHTML('beforeend', `<div class="alert alert-error mt-2">${esc(friendly(err))}</div>`); ev.target.disabled = false; }
    });
    e.target.value = '';
  });
}

async function editTopics() {
  openForm({
    title: 'Topic names',
    fields: topics.map((t) => ({ name: 't' + t.id, label: `Topic ${t.id}`, required: true, full: true })),
    values: Object.fromEntries(topics.map((t) => ['t' + t.id, t.title])),
    intro: '<div class="help">প্রশ্ন টপিক অনুযায়ী ভাগ করা থাকে, আর ফলাফলে টপিকভিত্তিক নম্বর দেখায়। এখানে শুধু নাম বদলানো যায়। নতুন টপিক লাগলে নিচে "Add topic" লিখুন।</div>',
    onSubmit: async (v) => {
      for (const t of topics) if (v['t' + t.id] !== t.title) must(await sb.from('exam_topics').update({ title: v['t' + t.id] }).eq('id', t.id));
      toast('Topics saved');
      await load();
    },
  });
}

async function addTopic() {
  const title = prompt('New topic name (e.g. ক্লাস ৯ — Inventory):');
  if (!title?.trim()) return;
  const id = Math.max(0, ...topics.map((t) => t.id)) + 1;
  must(await sb.from('exam_topics').insert({ id, title: title.trim(), sort_order: id }));
  toast('Topic added. Edit an exam to include it.');
  await load();
}

content.innerHTML = `
  <div id="summary"></div>
  <div class="toolbar">
    <div class="left">
      <input class="input" type="search" id="f-q" placeholder="Search question or option…" aria-label="Search">
      <select class="select" id="f-topic" aria-label="Topic"></select>
      <select class="select" id="f-level" aria-label="Level" style="min-width:150px"><option value="">All levels</option>${LEVELS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <select class="select" id="f-status" aria-label="Status" style="min-width:130px"><option value="">Active + Off</option><option value="active">Active</option><option value="inactive">Off</option></select>
      <span class="small muted" id="count"></span>
    </div>
    <div class="btn-row" style="gap:8px">
      <button class="btn btn-light btn-sm" type="button" id="topics">${icon('edit')} Topics</button>
      <button class="btn btn-light btn-sm" type="button" id="add-topic">${icon('plus')} Add topic</button>
      <button class="btn btn-light btn-sm" type="button" id="export">${icon('download')} Export CSV</button>
      <button class="btn btn-light btn-sm" type="button" id="import">${icon('file')} Import CSV</button>
      <button class="btn btn-primary btn-sm" type="button" id="add">${icon('plus')} Add Question</button>
    </div>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

$('#f-q').addEventListener('input', (e) => { filter.q = e.target.value.trim().toLowerCase(); render(); });
$('#f-topic').addEventListener('change', (e) => { filter.topic = e.target.value; render(); });
$('#f-level').addEventListener('change', (e) => { filter.level = e.target.value; render(); });
$('#f-status').addEventListener('change', (e) => { filter.status = e.target.value; render(); });
$('#add').addEventListener('click', () => edit(null));
$('#import').addEventListener('click', importDialog);
$('#export').addEventListener('click', exportCsv);
$('#topics').addEventListener('click', editTopics);
$('#add-topic').addEventListener('click', () => addTopic().catch((err) => toast(friendly(err), 'error', 6000)));

onActions(content, visible, {
  edit: (r) => edit(r),
  toggle: async (r) => {
    must(await sb.from('exam_questions').update({ status: r.status === 'active' ? 'inactive' : 'active' }).eq('id', r.id));
    toast(r.status === 'active' ? 'Question turned off' : 'Question turned on');
    await load();
  },
  delete: async (r) => {
    if (!confirm('Delete this question?\n\nTip: "Turn off" keeps it for old results. Delete cannot be undone.')) return;
    must(await sb.from('exam_questions').delete().eq('id', r.id));
    toast('Deleted');
    await load();
  },
});

load().catch((err) => { $('#list').innerHTML = `<div class="alert alert-error">${esc(friendly(err))} — Did you run <b>supabase/exam-update.sql</b>?</div>`; });
