// Admin login + password reset
import { getClient } from '../supabase.js';
import { IS_CONFIGURED } from '../config.js';
import { $, esc, errorText } from '../utils.js';

const alertBox = $('#a-alert');
const show = (box, type, msg) => { box.innerHTML = `<div class="alert alert-${type}">${esc(msg)}</div>`; };
const params = new URLSearchParams(location.search);

(async () => {
  if (!IS_CONFIGURED) { show(alertBox, 'warning', 'Connect Supabase in js/config.js first (README → Step 8).'); return; }
  const sb = await getClient('admin');

  // Password-reset link from email: #access_token=...&refresh_token=...&type=recovery
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('type') === 'recovery' && hash.get('access_token')) {
    const { error } = await sb.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') });
    history.replaceState(null, '', location.pathname);
    if (error) { show(alertBox, 'error', 'The reset link is invalid or expired. Please request a new one.'); }
    else {
      $('#admin-login-form').hidden = true;
      $('#new-pass-form').hidden = false;
    }
  } else if (hash.get('error_description')) {
    show(alertBox, 'error', hash.get('error_description'));
  }

  if (params.get('denied')) show(alertBox, 'error', 'This account is not an admin. Ask the owner to add it to the admins list (README → Step 7).');

  // Already logged in as admin?
  const { data: { session } } = await sb.auth.getSession();
  if (session && !hash.get('type')) {
    const { data: ok } = await sb.rpc('is_admin');
    if (ok) { location.replace('/admin/'); return; }
  }

  $('#admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#a-email').value.trim();
    const password = $('#a-pass').value;
    if (!email || !password) return show(alertBox, 'error', 'Enter email and password.');
    const btn = e.submitter || $('#admin-login-form button[type="submit"]');
    btn.disabled = true;
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong email or password.' : error.message);
      const { data: ok, error: e2 } = await sb.rpc('is_admin');
      if (e2) throw e2;
      if (!ok) { await sb.auth.signOut(); throw new Error('This account is not an admin (README → Step 7).'); }
      location.replace('/admin/');
    } catch (err) {
      show(alertBox, 'error', errorText(err));
      btn.disabled = false;
    }
  });

  $('#forgot-btn').addEventListener('click', async () => {
    const email = $('#a-email').value.trim();
    if (!email) return show(alertBox, 'info', 'Type your admin email above, then click "Forgot password?" again.');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/admin/login' });
    if (error) show(alertBox, 'error', errorText(error));
    else show(alertBox, 'success', 'If this email is an admin account, a reset link has been sent. Check your inbox.');
  });

  $('#new-pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = $('#n-alert');
    const pw = $('#n-pass').value;
    if (pw.length < 8) return show(box, 'error', 'Use at least 8 characters.');
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return show(box, 'error', errorText(error));
    show(box, 'success', 'Password updated. Redirecting…');
    setTimeout(() => location.replace('/admin/'), 1200);
  });
})();
