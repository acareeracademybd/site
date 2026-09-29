// Admin → Messages from the contact form
import { adminInit, must, esc, icon, iconBtn, btn, toast, fmtDate, waLink, $ } from '../admin.js';

const { sb, content } = await adminInit('messages', 'Messages');
let rows = [];

async function load() {
  rows = must(await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500));
  $('#box').innerHTML = rows.length ? rows.map((m, i) => `
    <div class="msg-card${m.is_read ? '' : ' unread'}" data-i="${i}">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><b>${esc(m.name)}</b> ${m.is_read ? '' : '<span class="badge badge-warning">New</span>'}
          <div class="small muted">${[m.mobile, m.email].filter(Boolean).map(esc).join(' · ')} · ${fmtDate(m.created_at, true)}</div></div>
        <div class="actions" style="display:flex;gap:6px;flex-wrap:wrap">
          ${m.mobile ? `<a class="btn btn-whatsapp btn-sm" target="_blank" rel="noopener" href="${esc(waLink(m.mobile))}">${icon('whatsapp')} Reply</a>` : ''}
          ${m.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(m.email)}">${icon('mail')} Email</a>` : ''}
          ${btn('read', m.is_read ? 'Mark unread' : 'Mark read', 'check')}
          ${iconBtn('delete', 'trash', 'Delete', true)}
        </div>
      </div>
      <p class="mt-1 mb-0" style="white-space:pre-wrap">${esc(m.message)}</p>
    </div>`).join('') : `<div class="empty">${icon('mail')}<p class="mb-0">No messages yet.</p></div>`;
}

content.innerHTML = '<div class="panel"><div id="box"><div class="skeleton" style="min-height:160px"></div></div></div>';
content.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const m = rows[Number(b.closest('[data-i]').dataset.i)];
  if (b.dataset.action === 'read') must(await sb.from('contact_messages').update({ is_read: !m.is_read }).eq('id', m.id));
  if (b.dataset.action === 'delete') {
    if (!confirm('Delete this message?')) return;
    must(await sb.from('contact_messages').delete().eq('id', m.id));
    toast('Deleted');
  }
  await load();
});

await load();
