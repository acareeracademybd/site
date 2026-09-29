// Admin → Students (add, edit, deactivate, assign course/e-book, access codes, expiry)
import { adminInit, must, esc, icon, table, iconBtn, btn, onActions, openForm, openInfo, toast, statusBadge, showAccessCode, fmtDate, money, waLink, $, friendly } from '../admin.js';

const { sb, content } = await adminInit('students', 'Students');

let students = [];
let courses = [];
let ebooks = [];
let query = '';
let statusFilter = '';

const studentFields = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Email (used to log in)', type: 'email', required: true },
  { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: '01XXXXXXXXX' },
  { name: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['inactive', 'Inactive (blocked)']] },
  { name: 'notes', label: 'Notes (private)', type: 'textarea', rows: 2 },
];

async function load() {
  [students, courses, ebooks] = await Promise.all([
    sb.from('students').select('*, enrollments(count), ebook_purchases(count)').order('joined_at', { ascending: false }).range(0, 1999).then(must),
    sb.from('courses').select('id,title,course_type').order('sort_order').then(must),
    sb.from('ebooks').select('id,title').order('sort_order').then(must),
  ]);
  render();
}

const visible = () => students.filter((s) => (!statusFilter || s.status === statusFilter) &&
  (!query || [s.name, s.email, s.mobile].some((v) => String(v || '').toLowerCase().includes(query))));

function render() {
  const list = visible();
  $('#count').textContent = `${list.length} of ${students.length} students`;
  $('#list').innerHTML = table([
    ['Student', (s) => `<b>${esc(s.name)}</b><small>Joined ${fmtDate(s.joined_at)}</small>`],
    ['Email', (s) => esc(s.email)],
    ['Mobile', (s) => esc(s.mobile || '—')],
    ['Courses', (s) => s.enrollments?.[0]?.count ?? 0],
    ['E-books', (s) => s.ebook_purchases?.[0]?.count ?? 0],
    ['Status', (s) => statusBadge(s.status)],
  ], list, {
    empty: students.length ? 'No students match your search.' : 'No students yet. Students are created automatically when you approve a payment, or click "Add Student".',
    actions: () => btn('manage', 'View / Manage', 'eye', 'btn-light') + iconBtn('edit', 'edit', 'Edit') + iconBtn('toggle', 'lock', 'Activate / Deactivate'),
  });
}

content.innerHTML = `
  <div class="toolbar">
    <div class="left">
      <input class="input" type="search" id="q" placeholder="Search name, email or mobile…" aria-label="Search">
      <select class="select" id="status" aria-label="Status filter"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      <span class="small muted" id="count"></span>
    </div>
    <button class="btn btn-primary" type="button" id="add">${icon('plus')} Add Student</button>
  </div>
  <div id="list"><div class="skeleton" style="min-height:200px"></div></div>`;

$('#q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });
$('#status').addEventListener('change', (e) => { statusFilter = e.target.value; render(); });
$('#add').addEventListener('click', () => openForm({
  title: 'Add Student',
  fields: [...studentFields,
    { name: 'course_id', label: 'Assign a course (optional)', type: 'select', options: [['', '— none —'], ...courses.map((c) => [c.id, c.title])] },
    { name: 'ebook_id', label: 'Assign an e-book (optional)', type: 'select', options: [['', '— none —'], ...ebooks.map((b) => [b.id, b.title])] },
    { name: 'gen', label: 'Generate an Access Code now', type: 'checkbox', default: true, full: true }],
  values: { status: 'active', gen: true },
  onSubmit: async (v) => {
    const { course_id: courseId, ebook_id: ebookId, gen, ...data } = v;
    const s = must(await sb.from('students').insert(data).select().single());
    if (courseId) must(await sb.from('enrollments').insert({ student_id: s.id, course_id: courseId }));
    if (ebookId) must(await sb.from('ebook_purchases').insert({ student_id: s.id, ebook_id: ebookId }));
    toast('Student added');
    if (gen) {
      const r = must(await sb.rpc('admin_generate_code', { p_student_id: s.id, p_course_id: courseId || null, p_ebook_id: ebookId || null }));
      showAccessCode({ code: r.code, name: s.name, email: s.email, mobile: s.mobile });
    }
    await load();
  },
}));

onActions(content, () => visible(), {
  edit: (s) => openForm({
    title: 'Edit Student', fields: studentFields, values: s,
    onSubmit: async (v) => { must(await sb.from('students').update(v).eq('id', s.id)); toast('Saved'); await load(); },
  }),
  toggle: async (s) => {
    const to = s.status === 'active' ? 'inactive' : 'active';
    if (to === 'inactive' && !confirm(`Deactivate ${s.name}? They will immediately lose access to all courses and e-books.`)) return;
    must(await sb.from('students').update({ status: to }).eq('id', s.id));
    toast(to === 'active' ? 'Student activated' : 'Student deactivated');
    await load();
  },
  manage: (s) => manage(s),
});

// ---------------- Manage one student ----------------
async function manage(s) {
  const dlg = openInfo(s.name, '<div class="skeleton" style="min-height:200px"></div>', { wide: true });
  const body = dlg.querySelector('.modal-body');
  let activeCodes = 0;

  async function refresh() {
    const [student, enr, pur, codes, pays] = await Promise.all([
      sb.from('students').select('*').eq('id', s.id).single().then(must),
      sb.from('enrollments').select('*, courses(title,course_type)').eq('student_id', s.id).order('created_at').then(must),
      sb.from('ebook_purchases').select('*, ebooks(title)').eq('student_id', s.id).order('created_at').then(must),
      sb.from('access_codes').select('*').eq('student_id', s.id).order('created_at', { ascending: false }).then(must),
      sb.from('payments').select('*').or(`student_id.eq.${s.id},email.eq."${s.email}"`).order('created_at', { ascending: false }).then(must),
    ]);
    Object.assign(s, student);
    activeCodes = codes.filter((c) => c.status === 'active').length;
    const exp = (d) => (d ? (new Date(d) < new Date() ? `<span class="badge badge-danger">Expired ${fmtDate(d)}</span>` : `until ${fmtDate(d)}`) : 'Lifetime');
    const accessRow = (kind) => (r) => `<tr data-kind="${kind}" data-id="${esc(r.id)}">
        <td><b>${esc(kind === 'enr' ? r.courses?.title : r.ebooks?.title)}</b></td><td>${statusBadge(r.status)}</td><td>${exp(r.expires_at)}</td>
        <td class="actions-cell"><div class="actions">${btn('acc-expiry', 'Set expiry', 'calendar')}${btn('acc-toggle', r.status === 'active' ? 'Deactivate' : 'Activate', 'lock')}${iconBtn('acc-del', 'trash', 'Remove', true)}</div></td></tr>`;

    body.innerHTML = `
      <dl class="kv">
        <dt>Email</dt><dd>${esc(s.email)}</dd>
        <dt>Mobile</dt><dd>${esc(s.mobile || '—')} ${s.mobile ? `<a class="small" target="_blank" rel="noopener" href="${esc(waLink(s.mobile))}">WhatsApp</a>` : ''}</dd>
        <dt>Status</dt><dd>${statusBadge(s.status)}</dd>
        <dt>Joined</dt><dd>${fmtDate(s.joined_at)}</dd>
        ${s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ''}
      </dl>

      <h3 class="mt-3" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">Access codes ${btn('gen-code', 'Generate new code', 'key', 'btn-primary')}</h3>
      ${codes.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Status</th><th>Expiry</th><th>Last login</th><th>Created</th></tr></thead><tbody>
        ${codes.map((c) => `<tr><td><code>ACA-····-····-${esc(c.code_hint)}</code></td><td>${statusBadge(c.status)}</td><td>${exp(c.expires_at)}</td><td>${c.last_used_at ? fmtDate(c.last_used_at, true) : 'Never'}</td><td>${fmtDate(c.created_at)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted small">No access code yet.</p>'}

      <h3 class="mt-3">Courses</h3>
      ${enr.length ? `<div class="table-wrap"><table class="table"><tbody>${enr.map(accessRow('enr')).join('')}</tbody></table></div>` : '<p class="muted small">Not enrolled in any course.</p>'}
      <div class="form-row mt-2" style="align-items:end">
        <div class="field"><label for="as-course">Assign course</label><select class="select" id="as-course">${courses.filter((c) => !enr.some((e) => e.course_id === c.id)).map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('') || '<option value="">All courses assigned</option>'}</select></div>
        <div class="field"><label for="as-course-exp">Expiry (optional)</label><input class="input" type="date" id="as-course-exp"></div>
      </div>
      <div class="mt-1">${btn('assign-course', 'Assign course', 'plus', 'btn-light')}</div>

      <h3 class="mt-3">E-books</h3>
      ${pur.length ? `<div class="table-wrap"><table class="table"><tbody>${pur.map(accessRow('pur')).join('')}</tbody></table></div>` : '<p class="muted small">No e-books.</p>'}
      <div class="form-row mt-2" style="align-items:end">
        <div class="field"><label for="as-ebook">Assign e-book</label><select class="select" id="as-ebook">${ebooks.filter((b) => !pur.some((p) => p.ebook_id === b.id)).map((b) => `<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('') || '<option value="">All e-books assigned</option>'}</select></div>
        <div class="field"><label for="as-ebook-exp">Expiry (optional)</label><input class="input" type="date" id="as-ebook-exp"></div>
      </div>
      <div class="mt-1">${btn('assign-ebook', 'Assign e-book', 'plus', 'btn-light')}</div>

      <h3 class="mt-3">Payments</h3>
      ${pays.length ? `<div class="table-wrap"><table class="table"><tbody>${pays.map((p) => `<tr><td>${fmtDate(p.created_at)}</td><td>${esc(p.product_title)}</td><td>${money(p.amount)}</td><td>${esc(p.method)} · ${esc(p.transaction_id)}</td><td>${statusBadge(p.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">No payments.</p>'}`;
  }

  const endOfDay = (v) => (v ? new Date(v + 'T23:59:59').toISOString() : null);

  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const tr = b.closest('tr[data-kind]');
    const tableName = tr?.dataset.kind === 'enr' ? 'enrollments' : 'ebook_purchases';
    b.disabled = true;
    try {
      switch (b.dataset.action) {
        case 'gen-code': {
          const replace = activeCodes > 0 && confirm('Replace the old code?\n\nOK = old code stops working (recommended if it was lost or shared).\nCancel = keep the old code working too.');
          const r = must(await sb.rpc('admin_generate_code', { p_student_id: s.id, p_deactivate_old: replace }));
          showAccessCode({ code: r.code, name: s.name, email: s.email, mobile: s.mobile });
          break;
        }
        case 'assign-course': {
          const id = $('#as-course', body).value;
          if (!id) break;
          must(await sb.from('enrollments').upsert({ student_id: s.id, course_id: id, status: 'active', expires_at: endOfDay($('#as-course-exp', body).value) }, { onConflict: 'student_id,course_id' }));
          toast('Course assigned');
          break;
        }
        case 'assign-ebook': {
          const id = $('#as-ebook', body).value;
          if (!id) break;
          must(await sb.from('ebook_purchases').upsert({ student_id: s.id, ebook_id: id, status: 'active', expires_at: endOfDay($('#as-ebook-exp', body).value) }, { onConflict: 'student_id,ebook_id' }));
          toast('E-book assigned');
          break;
        }
        case 'acc-toggle': {
          const active = tr.querySelector('.badge-success');
          must(await sb.from(tableName).update({ status: active ? 'inactive' : 'active' }).eq('id', tr.dataset.id));
          break;
        }
        case 'acc-expiry': {
          const v = prompt('New expiry date (YYYY-MM-DD). Leave empty for lifetime access:', '');
          if (v === null) break;
          if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) { toast('Please use the format YYYY-MM-DD', 'error'); break; }
          must(await sb.from(tableName).update({ expires_at: endOfDay(v.trim()) }).eq('id', tr.dataset.id));
          toast('Expiry updated');
          break;
        }
        case 'acc-del': {
          if (!confirm('Remove this access from the student?')) break;
          must(await sb.from(tableName).delete().eq('id', tr.dataset.id));
          break;
        }
        default: return;
      }
      await refresh();
      load();
    } catch (err) { toast(friendly(err), 'error', 6000); }
    finally { b.disabled = false; }
  });

  try { await refresh(); } catch (err) { body.innerHTML = `<div class="alert alert-error">${esc(friendly(err))}</div>`; }
}

await load();
