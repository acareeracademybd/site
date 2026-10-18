// Approve / reject a payment (used by Dashboard and Payments pages)
import { sb, must, openForm, showAccessCode, esc, money, toast } from '../admin.js';

export function approvePayment(p, done) {
  openForm({
    title: 'Approve payment',
    submitLabel: 'Approve & give access',
    intro: `<div class="alert alert-info">
        <b>${esc(p.name)}</b> · ${esc(p.email)} · ${esc(p.mobile)}<br>
        ${esc(p.product_title)}${p.batch ? ' (' + esc(p.batch) + ')' : ''} — <b>${money(p.amount)}</b> via ${esc(p.method)} · TrxID <b>${esc(p.transaction_id)}</b>
        ${p.last_degree || p.profession ? `<br><span class="small">${esc(p.last_degree || '-')} · ${esc(p.profession || '-')} · Exp: ${esc(p.experience || '-')} · Source: ${esc(p.heard_from || '-')}</span>` : ''}
      </div>
      <p class="small muted mb-0">✔ Check your bKash/Nagad app that this Transaction ID and amount were received before approving.</p>`,
    fields: [{ name: 'expires', label: 'Access expiry date (optional — leave empty for lifetime access)', type: 'datetime', full: true }],
    onSubmit: async (v) => {
      const res = must(await sb.rpc('admin_approve_payment', { p_payment_id: p.id, p_access_expires_at: v.expires }));
      toast('Payment approved');
      showAccessCode(res);
      await done?.();
    },
  });
}

export function rejectPayment(p, done) {
  openForm({
    title: 'Reject payment',
    submitLabel: 'Reject',
    intro: `<p class="mb-0">Reject <b>${esc(p.product_title)}</b> from <b>${esc(p.name)}</b> (TrxID ${esc(p.transaction_id)})?</p>`,
    fields: [{ name: 'note', label: 'Reason (for your records)', type: 'textarea', rows: 2, placeholder: 'e.g. Transaction ID not found' }],
    onSubmit: async (v) => {
      must(await sb.rpc('admin_reject_payment', { p_payment_id: p.id, p_note: v.note }));
      toast('Payment rejected');
      await done?.();
    },
  });
}
