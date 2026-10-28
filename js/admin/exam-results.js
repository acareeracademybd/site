// Admin → Exam Results: every attempt, filters, answer sheet, extra attempt, CSV export.
import { adminInit, must, esc, icon, table, iconBtn, btn, onActions, openInfo, toast, fmtDate, $, friendly } from '../admin.js';

const { sb, content } = await adminInit('exam-results', 'Exam Results');

const LETTER = { a: 'ক', b: 'খ', c: 'গ', d: 'ঘ' };
let rows = [];
let exams = [];
const f = { q: '', exam: '', result: '', from: '', to: '' };

const num = (v) => (v == null ? '—' : Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(2));

async function load() {
  // Close attempts whose time is over (student closed the browser) so their result is final
  await sb.rpc('admin_exam_close_expired').then(() => {}, () => {});
  let q = sb.from('exam_attempts').select('id,exam_id,student_id,name,email,exam_title,exam_day,started_at,deadline,submitted_at,status,question_count,total_marks,pass_marks,correct_count,score,passed,tab_switches,counts_for_limit,result_email_at,breakdown')
    .order('started_at', { ascending: false }).range(0, 4999);
  if (f.from) q = q.gte('exam_day', f.from);
  if (f.to) q = q.lte('exam_day', f.to);
  [rows, exams] = await Promise.all([q.then(must), sb.from('exams').select('id,title').order('sort_order').then(must)]);
  const sel = $('#f-exam');
  sel.innerHTML = '<option value="">All exams</option>' + exams.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
  sel.value = f.exam;
  render();
}

const visible = () => rows.filter((r) =>
  (!f.exam || r.exam_id === f.exam) &&
  (!f.result || (f.result === 'pass' ? r.passed === true : f.result === 'fail' ? r.passed === false : r.status === 'in_progress')) &&
  (!f.q || [r.name, r.email].some((v) => String(v || '').toLowerCase().includes(f.q))));

function statusCell(r) {
  if (r.status === 'in_progress') return '<span class="badge badge-warning">Running</span>';
  const b = r.passed ? '<span class="badge badge-success">Pass</span>' : '<span class="badge badge-danger">Fail</span>';
  return b + (r.status === 'timeout' ? '<small>Time over (auto)</small>' : '');
}

function render() {
  const list = visible();
  const done = list.filter((r) => r.status !== 'in_progress');
  const passed = done.filter((r) => r.passed).length;
  const avg = done.length ? done.reduce((s, r) => s + Number(r.score || 0) / Number(r.total_marks || 100) * 100, 0) / done.length : 0;
  const people = new Set(list.map((r) => r.email)).size;
  $('#tiles').innerHTML = `<div class="tile-grid">
    <div class="tile"><span>Attempts</span><b>${list.length}</b></div>
    <div class="tile"><span>Students</span><b>${people}</b></div>
    <div class="tile"><span>Passed</span><b>${passed}${done.length ? ` <small style="font-size:.9rem;color:var(--muted)">(${Math.round(passed / done.length * 100)}%)</small>` : ''}</b></div>
    <div class="tile"><span>Average score</span><b>${done.length ? avg.toFixed(1) + '%' : '—'}</b></div>
  </div>`;
  $('#count').textContent = `${list.length} of ${rows.length}`;
  $('#list').innerHTML = table([
    ['Student', (r) => `<b>${esc(r.name)}</b><small>${esc(r.email)}</small>`],
    ['Exam', (r) => `<span class="small">${esc(r.exam_title)}</span>`],
    ['Date', (r) => `${fmtDate(r.started_at, true)}`],
    ['Score', (r) => (r.score == null ? '—' : `<b>${num(r.score)}</b> / ${num(r.total_marks)}<small>${r.correct_count}/${r.question_count} correct</small>`)],
    ['Result', statusCell],
    ['Tab left', (r) => (r.tab_switches ? `<span style="color:${r.tab_switches >= 3 ? 'var(--danger)' : 'var(--warning)'};font-weight:600">${r.tab_switches}×</span>` : '0')],
    ['Counts', (r) => (r.counts_for_limit ? '<span class="small">Yes</span>' : '<span class="badge badge-muted">Extra</span>')],
  ], list, {
    empty: rows.length ? 'No results match the filter.' : 'No one has taken an exam yet.',
    actions: (r) => btn('view', 'Answers', 'eye', 'btn-light') +
      iconBtn('extra', 'refresh', r.counts_for_limit ? 'Give an extra attempt today (this one stops counting)' : 'Count this attempt again') +
      iconBtn('delete', 'trash', 'Delete', true),
  });
}

async function view(r) {
  const d = must(await sb.rpc('admin_exam_attempt', { p_attempt_id: r.id }));
  const a = d.attempt;
  const items = d.items || [];
  const bd = Array.isArray(a.breakdown) ? a.breakdown : [];
  openInfo(`${a.name} — ${a.exam_title}`, `
    <div class="tile-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <div class="tile"><span>Score</span><b>${num(a.score)} / ${num(a.total_marks)}</b></div>
      <div class="tile"><span>Result</span><b style="color:${a.passed ? 'var(--success)' : 'var(--danger)'}">${a.status === 'in_progress' ? 'Running' : a.passed ? 'Pass' : 'Fail'}</b></div>
      <div class="tile"><span>Time used</span><b>${a.submitted_at ? Math.max(1, Math.round((new Date(a.submitted_at) - new Date(a.started_at)) / 60000)) + ' min' : '—'}</b></div>
      <div class="tile"><span>Left the tab</span><b>${a.tab_switches}×</b></div>
    </div>
    <p class="small muted">${esc(a.email)} · Started ${fmtDate(a.started_at, true)} · ${a.result_email_at ? 'Result emailed ' + fmtDate(a.result_email_at, true) : 'Result not emailed yet'}</p>
    ${bd.length ? `<p><b>By topic:</b> ${bd.map((b) => `${esc(b.topic.split(' — ')[1] || b.topic)} <b>${b.correct}/${b.total}</b>`).join(' · ')}</p>` : ''}
    ${items.map((it) => {
      const ok = it.chosen && it.chosen === it.correct;
      return `<div style="border:1px solid var(--line);border-left:4px solid ${ok ? 'var(--success)' : it.chosen ? 'var(--danger)' : '#C9D8E2'};border-radius:8px;padding:10px 12px;margin:8px 0">
        <div class="small muted">Q${it.pos} · ${esc(it.topic || '')} · ${esc(it.difficulty || '')}</div>
        <div style="font-weight:600;margin:2px 0 6px">${esc(it.question || '(question deleted)')}</div>
        ${['a', 'b', 'c', 'd'].map((k) => `<div class="small" style="${k === it.correct ? 'color:var(--success);font-weight:600' : k === it.chosen ? 'color:var(--danger);text-decoration:line-through' : ''}">${LETTER[k]}) ${esc(it.options?.[k] || '')}${k === it.correct ? ' ✔' : ''}${k === it.chosen && k !== it.correct ? ' ← student' : ''}</div>`).join('')}
        ${!it.chosen ? '<div class="small" style="color:var(--warning)">Not answered</div>' : ''}
      </div>`;
    }).join('')}`, { wide: true });
}

function exportCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Name', 'Email', 'Exam', 'Date (BD)', 'Started', 'Submitted', 'Status', 'Correct', 'Questions', 'Score', 'Total', 'Pass marks', 'Result', 'Tab left', 'Counts for limit'];
  const lines = [head.map(cell).join(',')].concat(visible().map((r) => [
    r.name, r.email, r.exam_title, r.exam_day, fmtDate(r.started_at, true), r.submitted_at ? fmtDate(r.submitted_at, true) : '',
    r.status, r.correct_count ?? '', r.question_count, r.score ?? '', r.total_marks, r.pass_marks,
    r.status === 'in_progress' ? '' : r.passed ? 'Pass' : 'Fail', r.tab_switches, r.counts_for_limit ? 'Yes' : 'No',
  ].map(cell).join(',')));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `exam-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

content.innerHTML = `
  <div id="tiles"></div>
  <div class="toolbar">
    <div class="left">
      <input class="input" type="search" id="f-q" placeholder="Search name or email…" aria-label="Search">
      <select class="select" id="f-exam" aria-label="Exam"></select>
      <select class="select" id="f-result" aria-label="Result" style="min-width:140px"><option value="">All results</option><option value="pass">Passed</option><option value="fail">Failed</option><option value="running">Running now</option></select>
      <label class="small">From <input class="input" type="date" id="f-from" style="min-width:0;width:auto"></label>
      <label class="small">To <input class="input" type="date" id="f-to" style="min-width:0;width:auto"></label>
      <span class="small muted" id="count"></span>
    </div>
    <div class="btn-row" style="gap:8px">
      <button class="btn btn-light btn-sm" type="button" id="reload">${icon('refresh')} Refresh</button>
      <button class="btn btn-primary btn-sm" type="button" id="export">${icon('download')} Export CSV</button>
    </div>
  </div>
  <div class="help" style="margin-bottom:14px"><b>Passed</b> filter → সার্টিফিকেটের যোগ্য শিক্ষার্থীদের তালিকা। "Tab left" = পরীক্ষার সময় কতবার অন্য ট্যাব/অ্যাপে গিয়েছে। একই দিনে কাউকে আরেকবার সুযোগ দিতে ${icon('refresh')} চাপুন।</div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

$('#f-q').addEventListener('input', (e) => { f.q = e.target.value.trim().toLowerCase(); render(); });
$('#f-exam').addEventListener('change', (e) => { f.exam = e.target.value; render(); });
$('#f-result').addEventListener('change', (e) => { f.result = e.target.value; render(); });
$('#f-from').addEventListener('change', (e) => { f.from = e.target.value; load().catch((err) => toast(friendly(err), 'error', 6000)); });
$('#f-to').addEventListener('change', (e) => { f.to = e.target.value; load().catch((err) => toast(friendly(err), 'error', 6000)); });
$('#reload').addEventListener('click', () => load().then(() => toast('Updated')).catch((err) => toast(friendly(err), 'error', 6000)));
$('#export').addEventListener('click', exportCsv);

onActions(content, visible, {
  view: (r) => view(r),
  extra: async (r) => {
    const next = !r.counts_for_limit;
    if (!next && !confirm(`Give ${r.name} one extra attempt today?\n\nThis attempt and its result stay saved; it just stops counting toward the daily limit.`)) return;
    must(await sb.from('exam_attempts').update({ counts_for_limit: next }).eq('id', r.id));
    toast(next ? 'Counts toward the limit again' : 'Extra attempt given');
    await load();
  },
  delete: async (r) => {
    if (!confirm(`Delete this result of ${r.name} (${num(r.score)}/${num(r.total_marks)})?\n\nThis cannot be undone.`)) return;
    must(await sb.from('exam_attempts').delete().eq('id', r.id));
    toast('Deleted');
    await load();
  },
});

load().catch((err) => { $('#list').innerHTML = `<div class="alert alert-error">${esc(friendly(err))} — Did you run <b>supabase/exam-update.sql</b>?</div>`; });
