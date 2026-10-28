// Online exam for registered students.
//  1. Choose exam → enter email → a 6-digit code is emailed.
//  2. Enter code → the database picks random questions and starts the timer.
//  3. Every answer is saved at once (refresh / power cut is safe).
//  4. Submit (or time over) → the database marks it and emails the result.
// Correct answers never come to the browser; marking happens in the database.
import { initLayout } from './settings.js';
import { rpc } from './supabase.js';
import { IS_CONFIGURED } from './config.js';
import { $, $$, esc, icon, param, toast, errorText } from './utils.js';

const root = $('#exam-root');
const TOKEN_KEY = 'aca-exam-token';
const LETTERS = ['ক', 'খ', 'গ', 'ঘ'];
const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const num = (n) => { const v = Number(n); return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, ''); };

const ERRORS = {
  exam_closed: 'এই পরীক্ষাটি এখন বন্ধ আছে।',
  bad_email: 'সঠিক ইমেইল ঠিকানা লিখুন।',
  not_student: 'এই ইমেইলটি আমাদের নিবন্ধিত শিক্ষার্থীর তালিকায় নেই। ভর্তির সময় যে ইমেইল দিয়েছিলেন সেটি লিখুন, অথবা আমাদের সাথে যোগাযোগ করুন।',
  inactive: 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয়। অনুগ্রহ করে যোগাযোগ করুন।',
  not_eligible: 'এই পরীক্ষাটি শুধু সংশ্লিষ্ট কোর্সে ভর্তি হওয়া শিক্ষার্থীদের জন্য।',
  limit: 'আজকের জন্য এই পরীক্ষার সর্বোচ্চ সংখ্যক চেষ্টা শেষ। আগামীকাল আবার চেষ্টা করুন।',
  wait: 'একটু আগেই কোড পাঠানো হয়েছে। ১ মিনিট পর আবার চেষ্টা করুন।',
  too_many_codes: 'আজ অনেকবার কোড চাওয়া হয়েছে। পরে আবার চেষ্টা করুন।',
  email_not_configured: 'ইমেইল পাঠানোর ব্যবস্থা এখনো চালু হয়নি। অনুগ্রহ করে অ্যাডমিনকে জানান।',
  no_code: 'কোডটি আর কার্যকর নেই। নতুন কোড নিন।',
  expired: 'কোডের মেয়াদ (১০ মিনিট) শেষ। নতুন কোড নিন।',
  too_many_tries: 'অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।',
  invalid_code: 'কোডটি সঠিক নয়।',
  not_ready: 'এই পরীক্ষার জন্য প্রশ্নব্যাংকে যথেষ্ট প্রশ্ন নেই। অনুগ্রহ করে অ্যাডমিনকে জানান।',
  no_attempt: 'পরীক্ষাটি পাওয়া যায়নি (অন্য ডিভাইসে খোলা হয়ে থাকতে পারে)।',
};
const errMsg = (r) => {
  let m = ERRORS[r?.error] || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';
  if (r?.error === 'invalid_code' && r.tries_left != null) m += ` আর ${bn(Math.max(0, r.tries_left))} বার চেষ্টা করতে পারবেন।`;
  if (r?.error === 'limit' && r.max) m = `আজকের জন্য এই পরীক্ষার সর্বোচ্চ ${bn(r.max)} বার চেষ্টা শেষ। আগামীকাল আবার চেষ্টা করুন।`;
  return m;
};
const alertHtml = (msg, type = 'error') => `<div class="alert alert-${type}">${esc(msg)}</div>`;

const store = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode: refresh will need a new code */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

let exams = [];
let run = null; // running exam state

// ------------------------------------------------------------------
// 1. Exam list
// ------------------------------------------------------------------
function factsHtml(e) {
  return `<div class="exam-facts">
    <span>${icon('list')}${bn(e.question_count)}টি প্রশ্ন</span>
    <span>${icon('award')}পূর্ণমান ${bn(num(e.total_marks))} · পাশ ${bn(num(e.pass_marks))}</span>
    <span>${icon('clock')}${bn(e.duration_minutes)} মিনিট</span>
    <span>${icon('refresh')}দিনে সর্বোচ্চ ${bn(e.max_attempts_per_day)} বার</span>
  </div>`;
}

function showList() {
  document.body.classList.remove('exam-running');
  if (!exams.length) {
    root.innerHTML = `<div class="exam-head"><h1>Online Exam</h1></div>
      <div class="card card-pad">${alertHtml('এই মুহূর্তে কোনো পরীক্ষা চালু নেই। পরে আবার দেখুন।', 'info')}</div>`;
    return;
  }
  root.innerHTML = `
    <div class="exam-head"><h1>Online Exam</h1>
      <p>শুধু নিবন্ধিত শিক্ষার্থীরা পরীক্ষা দিতে পারবেন। ভর্তির সময় দেওয়া ইমেইলে একটি কোড যাবে, সেটি দিয়ে পরীক্ষা শুরু হবে।</p></div>
    <div class="exam-list">${exams.map((e) => `
      <article class="card exam-card">
        <h2>${esc(e.title)}</h2>
        ${e.description ? `<p>${esc(e.description)}</p>` : ''}
        ${factsHtml(e)}
        <a class="btn btn-primary" href="?exam=${encodeURIComponent(e.slug)}${param('email') ? '&email=' + encodeURIComponent(param('email')) : ''}" data-exam="${esc(e.slug)}">পরীক্ষা দিন ${icon('arrow-right')}</a>
      </article>`).join('')}</div>`;
  $$('[data-exam]', root).forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    showEmail(exams.find((x) => x.slug === a.dataset.exam), param('email') || '');
  }));
}

// ------------------------------------------------------------------
// 2. Email → code
// ------------------------------------------------------------------
function showEmail(exam, presetEmail = '') {
  document.body.classList.remove('exam-running');
  root.innerHTML = `
    <div class="card exam-box">
      <h1>${esc(exam.title)}</h1>
      ${factsHtml(exam)}
      <ul class="exam-rules">
        <li>প্রতিটি প্রশ্নের ৪টি অপশনের মধ্যে একটি সঠিক। ভুল উত্তরে নম্বর কাটা যাবে না।</li>
        <li>প্রত্যেক পরীক্ষার্থী আলাদা প্রশ্ন পাবেন, প্রশ্ন ও অপশনের ক্রমও আলাদা।</li>
        <li>সময় শেষ হলে উত্তরপত্র নিজে থেকেই জমা হবে। পেজ রিফ্রেশ হলেও সময় থামবে না।</li>
        <li>পরীক্ষার সময় অন্য ট্যাব বা অ্যাপে গেলে তা রেকর্ড হবে।</li>
        <li>ফলাফল সাথে সাথে দেখানো হবে এবং ইমেইলেও যাবে।</li>
      </ul>
      <form class="form" id="email-form" novalidate>
        <div class="field"><label for="x-email">আপনার ইমেইল (ভর্তির সময় যেটি দিয়েছিলেন)</label>
          <input class="input" id="x-email" type="email" required autocomplete="email" placeholder="student@gmail.com" value="${esc(presetEmail)}"></div>
        <div id="x-alert" role="alert"></div>
        <button class="btn btn-primary btn-block" type="submit">ইমেইলে কোড পাঠান</button>
      </form>
      <div class="link-row"><a href="/exam" data-back>← সব পরীক্ষা</a></div>
    </div>`;
  $('[data-back]', root).addEventListener('click', (ev) => { ev.preventDefault(); history.pushState(null, '', '/exam'); showList(); });
  const form = $('#email-form', root);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = $('#x-email', root).value.trim().toLowerCase();
    const box = $('#x-alert', root);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { box.innerHTML = alertHtml(ERRORS.bad_email); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'পাঠানো হচ্ছে…'; box.innerHTML = '';
    try {
      const r = await rpc('exam_request_code', { p_exam_id: exam.id, p_email: email });
      if (r?.ok) return showCode(exam, email, r);
      // A running exam on another device can still be continued with a code that was sent earlier
      box.innerHTML = alertHtml(errMsg(r));
      if (r?.error === 'wait') box.insertAdjacentHTML('beforeend', '<p class="small mt-1 mb-0"><a href="#" data-have>আগের কোডটি আমার কাছে আছে →</a></p>');
      $('[data-have]', box)?.addEventListener('click', (e2) => { e2.preventDefault(); showCode(exam, email, {}); });
    } catch (err) { box.innerHTML = alertHtml(errorText(err)); }
    btn.disabled = false; btn.textContent = 'ইমেইলে কোড পাঠান';
  });
}

function showCode(exam, email, info) {
  root.innerHTML = `
    <div class="card exam-box">
      <h1>কোড দিন</h1>
      <p class="muted">${info.name ? `${esc(info.name)}, ` : ''}<b>${esc(email)}</b> ঠিকানায় ৬ সংখ্যার একটি কোড পাঠানো হয়েছে (Inbox না পেলে <b>Spam/Promotions</b> দেখুন)। কোডটি ১০ মিনিট কার্যকর।</p>
      ${info.attempts_left != null ? `<p class="small muted">আজ এই পরীক্ষায় আর ${bn(info.attempts_left)} বার অংশ নিতে পারবেন।</p>` : ''}
      <form class="form" id="code-form" novalidate>
        <div class="field"><label for="x-code">পরীক্ষার কোড</label>
          <input class="input otp-input" id="x-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required placeholder="••••••"></div>
        <div id="x-alert" role="alert"></div>
        <button class="btn btn-primary btn-block" type="submit">পরীক্ষা শুরু করুন</button>
      </form>
      <div class="link-row"><button type="button" data-change>ইমেইল বদলান</button><button type="button" data-resend disabled>নতুন কোড (৬০)</button></div>
    </div>`;
  const input = $('#x-code', root);
  input.focus();
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); });
  $('[data-change]', root).addEventListener('click', () => showEmail(exam, email));

  const resend = $('[data-resend]', root);
  let left = 60;
  const tick = setInterval(() => {
    if (!document.body.contains(resend)) return clearInterval(tick);
    left -= 1;
    if (left <= 0) { clearInterval(tick); resend.disabled = false; resend.textContent = 'নতুন কোড পাঠান'; }
    else resend.textContent = `নতুন কোড (${bn(left)})`;
  }, 1000);
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try {
      const r = await rpc('exam_request_code', { p_exam_id: exam.id, p_email: email });
      if (r?.ok) { toast('নতুন কোড পাঠানো হয়েছে'); showCode(exam, email, r); } else { $('#x-alert', root).innerHTML = alertHtml(errMsg(r)); resend.disabled = false; }
    } catch (err) { $('#x-alert', root).innerHTML = alertHtml(errorText(err)); resend.disabled = false; }
  });

  const form = $('#code-form', root);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const box = $('#x-alert', root);
    if (input.value.length !== 6) { box.innerHTML = alertHtml('৬ সংখ্যার কোডটি লিখুন।'); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'শুরু হচ্ছে…'; box.innerHTML = '';
    try {
      const r = await rpc('exam_start', { p_exam_id: exam.id, p_email: email, p_code: input.value });
      if (r?.ok) {
        clearInterval(tick);
        store.set(r.token);
        startRun(r, r.token);
        if (r.resumed) toast('আগের চলমান পরীক্ষাটি আবার খোলা হয়েছে — সময় চলছিল।', 'info', 6000);
        return;
      }
      box.innerHTML = alertHtml(errMsg(r));
    } catch (err) { box.innerHTML = alertHtml(errorText(err)); }
    btn.disabled = false; btn.textContent = 'পরীক্ষা শুরু করুন';
  });
}

// ------------------------------------------------------------------
// 3. Running exam
// ------------------------------------------------------------------
function startRun(data, token) {
  run = {
    token,
    data,
    current: 0,
    answers: data.questions.map((q) => (q.chosen == null ? null : q.chosen)),
    pending: new Map(),
    offset: new Date(data.server_now).getTime() - Date.now(),
    deadline: new Date(data.deadline).getTime(),
    submitting: false,
    timer: null,
  };
  document.body.classList.add('exam-running');
  const firstOpen = run.answers.findIndex((a) => a == null);
  run.current = firstOpen >= 0 ? firstOpen : 0;
  renderRun();
  run.timer = setInterval(updateTimer, 500);
  updateTimer();
}

const remainingMs = () => run.deadline - (Date.now() + run.offset);
const answeredCount = () => run.answers.filter((a) => a != null).length;

function renderRun() {
  const d = run.data;
  root.innerHTML = `
    <div class="exam-run">
      <div class="exam-bar">
        <div class="title">${esc(d.exam_title)}<small>${esc(d.name)} · উত্তর <span id="r-count">${bn(answeredCount())}</span>/${bn(d.question_count)}</small></div>
        <div class="exam-timer" id="r-timer" role="timer" aria-live="off">${icon('clock')}<span>--:--</span></div>
      </div>
      <section class="card exam-q" id="r-question" aria-live="polite"></section>
      <div class="card exam-grid-wrap">
        <h2>প্রশ্নের তালিকা <span>সবুজ = উত্তর দেওয়া হয়েছে</span></h2>
        <div class="exam-grid" id="r-grid">${d.questions.map((q, i) => `<button type="button" data-go="${i}" aria-label="প্রশ্ন ${i + 1}">${bn(i + 1)}</button>`).join('')}</div>
        <div class="exam-submit-row"><button type="button" class="btn btn-accent" id="r-submit">${icon('check')} উত্তরপত্র জমা দিন</button></div>
      </div>
    </div>`;
  $('#r-grid', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) { run.current = Number(b.dataset.go); renderQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  $('#r-submit', root).addEventListener('click', confirmSubmit);
  renderQuestion();
}

function renderQuestion() {
  const d = run.data;
  const i = run.current;
  const q = d.questions[i];
  const chosen = run.answers[i];
  $('#r-question', root).innerHTML = `
    <div class="q-num"><span>প্রশ্ন ${bn(i + 1)} / ${bn(d.question_count)}</span><span class="save-state" id="r-save"></span></div>
    <p class="q-text">${esc(q.text)}</p>
    <div class="exam-opts" role="radiogroup" aria-label="উত্তর">
      ${q.options.map((o, k) => `
        <label class="exam-opt"><input type="radio" name="opt" value="${k}"${chosen === k ? ' checked' : ''}>
          <span class="letter">${LETTERS[k]}</span><span>${esc(o)}</span></label>`).join('')}
    </div>
    <div class="exam-nav">
      <button type="button" class="btn btn-light" data-step="-1"${i === 0 ? ' disabled' : ''}>${icon('arrow-left')} আগের</button>
      ${chosen != null ? '<button type="button" class="btn btn-ghost" data-clear>উত্তর মুছুন</button>' : ''}
      ${i < d.question_count - 1
        ? `<button type="button" class="btn btn-primary" data-step="1">পরের ${icon('arrow-right')}</button>`
        : `<button type="button" class="btn btn-accent" data-finish>${icon('check')} জমা দিন</button>`}
    </div>`;
  const box = $('#r-question', root);
  $$('input[name=opt]', box).forEach((inp) => inp.addEventListener('change', () => choose(i, Number(inp.value))));
  $$('[data-step]', box).forEach((b) => b.addEventListener('click', () => {
    run.current = Math.min(d.question_count - 1, Math.max(0, i + Number(b.dataset.step)));
    renderQuestion();
  }));
  $('[data-clear]', box)?.addEventListener('click', () => choose(i, null));
  $('[data-finish]', box)?.addEventListener('click', confirmSubmit);
  showSaveState(i);
  updateGrid();
}

function updateGrid() {
  $$('#r-grid [data-go]', root).forEach((b, k) => {
    b.classList.toggle('done', run.answers[k] != null);
    b.classList.toggle('current', k === run.current);
  });
  const c = $('#r-count', root);
  if (c) c.textContent = bn(answeredCount());
}

function showSaveState(i) {
  const el = $('#r-save', root);
  if (!el || run.current !== i) return;
  const p = run.pending.get(i);
  el.className = 'save-state' + (p === 'error' ? ' err' : '');
  el.textContent = p === 'saving' ? 'সংরক্ষণ হচ্ছে…' : p === 'error' ? 'সংরক্ষণ হয়নি — আবার চেষ্টা হচ্ছে' : (run.answers[i] != null ? '✓ সংরক্ষিত' : '');
}

async function choose(i, choice, attempt = 0) {
  if (run.submitting) return;
  run.answers[i] = choice;
  run.pending.set(i, 'saving');
  if (run.current === i) {
    renderQuestion();
    $(`#r-question input[value="${choice}"]`, root)?.focus();
  } else updateGrid();
  try {
    const r = await rpc('exam_answer', { p_token: run.token, p_position: run.data.questions[i].pos, p_choice: choice });
    if (run.answers[i] !== choice) return; // a newer answer is being saved
    if (r?.ok) { run.pending.delete(i); showSaveState(i); return; }
    if (r?.error === 'time_over' || r?.error === 'finished') return finish(true);
    if (r?.error === 'no_attempt') return lostAttempt();
    throw new Error(r?.error || 'save failed');
  } catch {
    if (run.answers[i] !== choice) return;
    run.pending.set(i, 'error');
    showSaveState(i);
    if (attempt < 5) setTimeout(() => { if (run && run.answers[i] === choice && !run.submitting) choose(i, choice, attempt + 1); }, 1500 * (attempt + 1));
  }
}

function updateTimer() {
  if (!run) return;
  const ms = Math.max(0, remainingMs());
  const el = $('#r-timer', root);
  if (el) {
    const s = Math.ceil(ms / 1000);
    el.querySelector('span').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('warn', s <= 300 && s > 60);
    el.classList.toggle('danger', s <= 60);
  }
  if (ms <= 0 && !run.submitting) {
    toast('সময় শেষ! উত্তরপত্র জমা হচ্ছে…', 'info', 5000);
    finish(true);
  }
}

function confirmSubmit() {
  const left = run.data.question_count - answeredCount();
  const dlg = document.createElement('dialog');
  dlg.className = 'exam-dialog';
  dlg.innerHTML = `<div class="in">
    <h2>উত্তরপত্র জমা দেবেন?</h2>
    <p>${left > 0 ? `<b style="color:var(--danger)">${bn(left)}টি প্রশ্নের উত্তর দেওয়া হয়নি।</b> ` : 'সব প্রশ্নের উত্তর দেওয়া হয়েছে। '}জমা দেওয়ার পর আর পরিবর্তন করা যাবে না।</p>
    <div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-no>ফিরে যাই</button><button type="button" class="btn btn-accent" data-yes>হ্যাঁ, জমা দিন</button></div>
  </div>`;
  document.body.appendChild(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  $('[data-no]', dlg).addEventListener('click', close);
  dlg.addEventListener('cancel', close);
  $('[data-yes]', dlg).addEventListener('click', () => { close(); finish(false); });
  dlg.showModal();
}

async function finish(auto) {
  if (!run || run.submitting) return;
  run.submitting = true;
  clearInterval(run.timer);
  root.querySelectorAll('button, input').forEach((el) => { el.disabled = true; });
  const token = run.token;
  // Give answers that are still saving a moment to arrive
  const waitUntil = Date.now() + 3000;
  while ([...run.pending.values()].includes('saving') && Date.now() < waitUntil) await new Promise((r) => setTimeout(r, 200));
  for (let k = 0; k < 4; k += 1) {
    try {
      const r = await rpc('exam_submit', { p_token: token });
      if (r?.ok) { stopRun(); store.clear(); showResult(r, auto); return; }
      if (r?.error === 'no_attempt') return lostAttempt();
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 2000 * (k + 1)));
  }
  root.insertAdjacentHTML('afterbegin', alertHtml('জমা দেওয়া যায়নি — ইন্টারনেট সংযোগ দেখে পেজটি রিফ্রেশ করুন। আপনার উত্তরগুলো সংরক্ষিত আছে, ফলাফল ইমেইলেও যাবে।'));
}

function stopRun() {
  if (run) clearInterval(run.timer);
  run = null;
  document.body.classList.remove('exam-running');
}

function lostAttempt() {
  stopRun();
  store.clear();
  root.innerHTML = `<div class="card exam-box">${alertHtml('এই পরীক্ষাটি অন্য ডিভাইস বা ট্যাবে খোলা হয়েছে, তাই এখানে বন্ধ করা হলো। যেকোনো একটি ডিভাইস থেকে পরীক্ষা দিন।', 'warning')}<div class="link-row"><a href="/exam">← সব পরীক্ষা</a></div></div>`;
}

// ------------------------------------------------------------------
// 4. Result
// ------------------------------------------------------------------
function showResult(r, auto = false) {
  document.body.classList.remove('exam-running');
  const pass = !!r.passed;
  root.innerHTML = `
    <div class="card exam-result">
      ${auto || r.status === 'timeout' ? alertHtml('সময় শেষ হওয়ায় উত্তরপত্র স্বয়ংক্রিয়ভাবে জমা হয়েছে।', 'info') : ''}
      <h1>${esc(r.exam_title)}</h1>
      <p class="muted mb-0">${esc(r.name)} · ${esc(r.email)}</p>
      <div class="score-ring${pass ? '' : ' fail'}"><b>${bn(num(r.score))}</b><span>/ ${bn(num(r.total_marks))}</span></div>
      <p class="verdict ${pass ? 'pass' : 'fail'}">${pass ? 'অভিনন্দন! আপনি পাশ করেছেন 🎉' : 'এবার পাশ হয়নি'}</p>
      <p class="muted">সঠিক উত্তর ${bn(r.correct_count)} / ${bn(r.question_count)} · উত্তর দিয়েছেন ${bn(r.answered_count)}টি · পাশ নম্বর ${bn(num(r.pass_marks))}</p>
      ${pass ? '<div class="alert alert-success" style="max-width:480px;margin:0 auto">পাশ করায় আপনি সার্টিফিকেটের জন্য যোগ্য। সার্টিফিকেটের বিষয়ে আমরা আপনার সাথে যোগাযোগ করব।</div>' : (r.attempts_left_today > 0
        ? `<div class="alert alert-info" style="max-width:480px;margin:0 auto">আজ আরও ${bn(r.attempts_left_today)} বার চেষ্টা করতে পারবেন। দুর্বল টপিকগুলো আবার দেখে নিন।</div>`
        : '<div class="alert alert-info" style="max-width:480px;margin:0 auto">আজকের চেষ্টা শেষ। টপিকগুলো আবার দেখে আগামীকাল চেষ্টা করুন।</div>')}
      ${Array.isArray(r.breakdown) && r.breakdown.length ? `<table class="breakdown"><tbody>${r.breakdown.map((b) => `<tr><td>${esc(b.topic)}</td><td>${bn(b.correct)} / ${bn(b.total)}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="small muted mt-3">ফলাফলের একটি কপি আপনার ইমেইলে পাঠানো হয়েছে।</p>
      <div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="/exam">সব পরীক্ষা</a><a class="btn btn-light" href="/dashboard">Dashboard</a></div>
    </div>`;
  window.scrollTo({ top: 0 });
}

// ------------------------------------------------------------------
// Anti-copy / leaving the tab
// ------------------------------------------------------------------
let lastFlag = 0;
let unloading = false; // a refresh/close is not "leaving the tab"
document.addEventListener('visibilitychange', () => {
  if (!run || run.submitting || unloading || document.visibilityState !== 'hidden') return;
  if (Date.now() - lastFlag < 3000) return;
  lastFlag = Date.now();
  rpc('exam_flag', { p_token: run.token }).catch(() => {});
  setTimeout(() => toast('সতর্কতা: পরীক্ষার সময় অন্য ট্যাব/অ্যাপে যাওয়া রেকর্ড করা হচ্ছে।', 'error', 6000), 400);
});
['copy', 'cut', 'contextmenu', 'dragstart'].forEach((t) => document.addEventListener(t, (e) => {
  if (run && e.target.closest?.('.exam-run')) e.preventDefault();
}));
window.addEventListener('beforeunload', (e) => {
  unloading = true;
  setTimeout(() => { unloading = false; }, 1500); // the student chose "Stay"
  if (run && !run.submitting) { e.preventDefault(); e.returnValue = ''; }
});
window.addEventListener('popstate', () => { if (!run) route(); });

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
function route() {
  const slug = param('exam');
  const exam = slug && exams.find((e) => e.slug === slug);
  if (exam) showEmail(exam, param('email') || '');
  else showList();
}

(async () => {
  initLayout();
  if (!IS_CONFIGURED) {
    root.innerHTML = `<div class="card exam-box"><h1>Setup needed</h1><p class="muted">Online exam works after the website is connected to Supabase.</p></div>`;
    return;
  }
  // Continue a running exam after refresh
  const saved = store.get();
  if (saved) {
    try {
      const r = await rpc('exam_state', { p_token: saved });
      if (r?.ok && r.state === 'running') { startRun(r, saved); return; }
      store.clear();
      if (r?.ok && r.state === 'finished') { showResult(r); exams = await rpc('exam_list').catch(() => []) || []; return; }
    } catch { /* fall through to list */ }
  }
  try {
    exams = (await rpc('exam_list')) || [];
    route();
  } catch (err) {
    root.innerHTML = `<div class="card card-pad">${alertHtml(errorText(err))}</div>`;
  }
})();
