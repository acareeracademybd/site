// Student login (Email + Access Code) and shared student-session helpers.
//
// How it works (secure):
//  1. The browser gets an anonymous Supabase session (a random, private id).
//  2. The database function student_login() checks the email + access code.
//     Only if they are correct is that browser session linked to the student.
//  3. Every page/file the student opens is checked again by the database
//     (Row Level Security) — hiding buttons is never the only protection.
import { getClient } from './supabase.js';
import { IS_CONFIGURED } from './config.js';
import { $, esc, param } from './utils.js';
import { initLayout } from './settings.js';

const NAME_KEY = 'aca-student-name';

const LOGIN_ERRORS = {
  invalid: 'Email অথবা Access Code সঠিক নয়। আবার চেষ্টা করুন।',
  too_many: 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।',
  inactive: 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয়। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।',
  no_session: 'লগইন শুরু করা যায়নি। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।',
};

export async function studentClient() {
  return getClient('student');
}

export async function loginStudent(email, code) {
  const sb = await studentClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
      if (/anonymous/i.test(error.message)) throw new Error('Login is not enabled yet. (Admin: turn on "Anonymous sign-ins" in Supabase → Authentication → Sign In / Providers.)');
      throw error;
    }
  }
  const { data, error } = await sb.rpc('student_login', { p_email: email, p_code: code });
  if (error) throw error;
  if (!data?.ok) throw new Error(LOGIN_ERRORS[data?.error] || LOGIN_ERRORS.invalid);
  try { localStorage.setItem(NAME_KEY, data.name || 'Student'); } catch { /* ignore */ }
  return data;
}

export async function logoutStudent(redirect = '/login') {
  try {
    const sb = await studentClient();
    await sb.rpc('student_logout');
    await sb.auth.signOut();
  } catch { /* already logged out */ }
  try { localStorage.removeItem(NAME_KEY); localStorage.removeItem('aca-student-auth'); } catch { /* ignore */ }
  location.href = redirect;
}

// For protected pages: returns the Supabase client, or redirects to /login
export async function requireStudent() {
  if (!IS_CONFIGURED) {
    const main = document.querySelector('main');
    main.innerHTML = `<div class="auth-wrap"><div class="card auth-card"><h1>Setup needed</h1><p class="muted">Student login works after the website is connected to Supabase (see README → Step 8).</p><a class="btn btn-primary" href="/">Back to Home</a></div></div>`;
    return null;
  }
  const sb = await studentClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    return null;
  }
  return sb;
}

// Call when the database says the session is no longer valid
export function sessionExpired() {
  try { localStorage.removeItem(NAME_KEY); } catch { /* ignore */ }
  location.replace('/login?expired=1&next=' + encodeURIComponent(location.pathname + location.search));
}

export const isSessionError = (err) => /not_logged_in/.test(err?.message || '');

// ---------------- Login page ----------------
async function loginPage() {
  initLayout();
  const form = $('#login-form');
  const alertBox = $('#login-alert');
  const show = (type, msg) => { alertBox.innerHTML = `<div class="alert alert-${type}">${esc(msg)}</div>`; };
  const next = param('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (!IS_CONFIGURED) show('warning', 'Demo mode: login will work after Supabase is connected (README → Step 8).');
  if (param('expired')) show('info', 'আপনার সেশন শেষ হয়েছে অথবা Access Code পরিবর্তন করা হয়েছে। আবার লগইন করুন।');
  if (param('email')) $('#l-email').value = param('email');

  // Already logged in on this browser?
  try {
    if (IS_CONFIGURED && localStorage.getItem(NAME_KEY) && localStorage.getItem('aca-student-auth') && !param('expired')) {
      location.replace(safeNext);
      return;
    }
  } catch { /* ignore */ }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#l-email').value.trim().toLowerCase();
    const code = $('#l-code').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return show('error', 'সঠিক Email লিখুন।');
    if (code.replace(/[^A-Za-z0-9]/g, '').length < 8) return show('error', 'সঠিক Access Code লিখুন (যেমন ACA-2026-XXXX-XXXX)।');
    if (!IS_CONFIGURED) return show('warning', 'Demo mode: connect Supabase first (README → Step 8).');
    const btn = $('#login-btn');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      await loginStudent(email, code);
      location.href = safeNext;
    } catch (err) {
      show('error', /Failed to fetch|NetworkError/i.test(err.message) ? 'Network problem. Please check your internet and try again.' : err.message);
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });
}

if (document.getElementById('login-form')) loginPage();
