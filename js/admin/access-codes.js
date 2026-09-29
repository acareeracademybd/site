// Admin → Access Codes
import { adminInit, must, esc, icon, table, iconBtn, btn, onActions, openForm, toast, statusBadge, showAccessCode, fmtDate, $ } from '../admin.js';

const { sb, content } = await adminInit('codes', 'Access Codes');

let rows = [];
let query = '';

content.innerHTML = `
  <div class="help" style="margin-bottom:16px">
    For security, only the <b>last 4 characters</b> of each code are stored and shown here — the full code is shown only once, when it is generated.
    If a student loses their code, click <b>Regenerate</b> (the old code stops working) and send the new one.
  </div>
  <div class="toolbar">
    <div class="left"><input class="input" type="search" id="q" placeholder="Search student name, email, last 4 characters…" aria-label="Search"></div>
    <button class="btn btn-primary" type="button" id="gen">${icon('key')} Generate code</button>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

async function load() {
  rows = must(await sb.from('access_codes').select('*, students(id,name,email,mobile,status), courses(title), ebooks(title)').order('created_at', { ascending: false }).limit(2000));
  render();
}

const visible = () => !query ? rows : rows.filter((c) => [c.students?.name, c.students?.email, c.code_hint, c.students?.mobile].some((v) => String(v || '').toLowerCase().includes(query)));
const expired = (c) => c.expires_at && new Date(c.expires_at) < new Date();

function render() {
  $('#list').innerHTML = table([
    ['Code', (c) => `<code>ACA-····-····-${esc(c.code_hint)}</code>`],
    ['Student', (c) => `<b>${esc(c.students?.name || '—')}</b><small>${esc(c.students?.email || '')}</small>`],
    ['For', (c) => esc(c.courses?.title || c.ebooks?.title || 'All purchases')],
    ['Status', (c) => (expired(c) ? '<span class="badge badge-danger">Expired</span>' : statusBadge(c.status))],
    ['Expiry', (c) => (c.expires_at ? fmtDate(c.expires_at) : 'No expiry')],
    ['Last login', (c) => (c.last_used_at ? fmtDate(c.last_used_at, true) : 'Never')],
    ['Created', (c) => fmtDate(c.created_at)],
  ], visible(), {
    empty: 'No access codes yet. Codes are created when you approve a payment.',
    actions: (c) => [
      btn('toggle', c.status === 'active' ? 'Deactivate' : 'Activate', 'lock'),
      btn('expiry', 'Expiry', 'calendar'),
      btn('regen', 'Regenerate', 'refresh', 'btn-light'),
      iconBtn('delete', 'trash', 'Delete', true),
    ].join(''),
  });
}

$('#q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

$('#gen').addEventListener('click', async () => {
  const students = must(await sb.from('students').select('id,name,email,mobile').order('name'));
  if (!students.length) { toast('Add a student first (Students page).', 'error'); return; }
  openForm({
    title: 'Generate Access Code',
    fields: [
      { name: 'student_id', label: 'Student', type: 'select', options: students.map((s) => [s.id, `${s.name} — ${s.email}`]), full: true },
      { name: 'expires', label: 'Code expiry (optional)', type: 'datetime' },
      { name: 'replace', label: 'Deactivate this student\'s old codes', type: 'checkbox', default: true },
    ],
    values: { replace: true },
    onSubmit: async (v) => {
      const s = students.find((x) => x.id === v.student_id);
      const r = must(await sb.rpc('admin_generate_code', { p_student_id: s.id, p_expires_at: v.expires, p_deactivate_old: v.replace }));
      showAccessCode({ code: r.code, name: s.name, email: s.email, mobile: s.mobile });
      await load();
    },
  });
});

onActions(content, () => visible(), {
  toggle: async (c) => {
    must(await sb.from('access_codes').update({ status: c.status === 'active' ? 'inactive' : 'active' }).eq('id', c.id));
    toast(c.status === 'active' ? 'Code deactivated — the student is logged out' : 'Code activated');
    await load();
  },
  expiry: (c) => openForm({
    title: 'Set code expiry',
    fields: [{ name: 'expires_at', label: 'Expiry date (empty = never expires)', type: 'datetime', full: true }],
    values: c,
    onSubmit: async (v) => { must(await sb.from('access_codes').update({ expires_at: v.expires_at }).eq('id', c.id)); toast('Saved'); await load(); },
  }),
  regen: async (c) => {
    if (!confirm(`Create a new code for ${c.students?.name}? All their old codes will stop working.`)) return;
    const r = must(await sb.rpc('admin_generate_code', { p_student_id: c.student_id, p_deactivate_old: true, p_course_id: c.course_id, p_ebook_id: c.ebook_id }));
    showAccessCode({ code: r.code, name: c.students?.name, email: c.students?.email, mobile: c.students?.mobile });
    await load();
  },
  delete: async (c) => {
    if (!confirm('Delete this code? The student will be logged out if they used it.')) return;
    must(await sb.from('access_codes').delete().eq('id', c.id));
    await load();
  },
});

await load();
