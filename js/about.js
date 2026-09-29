// About page — everything here is edited in Admin → Website Settings → Trainer / About
import { initLayout } from './settings.js';
import { $, esc, icon, lines, richText, safeUrl } from './utils.js';

(async () => {
  const s = await initLayout();
  if (s.trainer_photo_url) $('#trainer-photo').src = safeUrl(s.trainer_photo_url);
  if (s.trainer_name) $('#trainer-photo').alt = s.trainer_name;
  $('#trainer-bio').innerHTML = richText(s.trainer_bio || '');

  const facts = [
    ['briefcase', 'Professional Experience', s.trainer_experience],
    ['award', 'Educational Qualification', s.trainer_education],
    ['ledger', 'Accounting Experience', s.trainer_accounting_exp],
    ['users', 'Training Experience', s.trainer_training_exp],
    ['check', 'Achievements', s.trainer_achievements],
  ].filter(([, , v]) => lines(v).length);
  $('#trainer-facts').innerHTML = facts.map(([ic, title, v]) => `
    <div class="card fact"><h3>${icon(ic)}${esc(title)}</h3><ul>${lines(v).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('');

  const cards = [
    ['trend', 'Mission', s.academy_mission],
    ['globe', 'Vision', s.academy_vision],
    ['book', 'Learning Philosophy', s.academy_philosophy],
  ].filter(([, , v]) => v);
  $('#academy-cards').innerHTML = cards.map(([ic, title, v]) => `
    <div class="card feature"><div class="ico-wrap">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(v)}</p></div>`).join('');

  const ach = lines(s.academy_achievements);
  if (ach.length) {
    $('#academy-achievements').innerHTML = ach.map((a) => `<li>${icon('check')}<span>${esc(a)}</span></li>`).join('');
    $('#academy-achievements-card').hidden = false;
  }
})();
