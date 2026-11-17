// /certificate?id=CODE — student views, downloads (PDF / PNG) and shares a certificate on LinkedIn
import { initLayout } from './settings.js';
import { rpc } from './supabase.js';
import { $, esc, param, copyText, toast } from './utils.js';
import { renderCertificate, canvasToPdf, canvasBlob, downloadBlob, safeFileName, verifyUrl } from './certificate-render.js';

initLayout();
const root = $('#cert-root');

const msg = (cls, mark, title, text) => {
  root.innerHTML = `<div class="card verify-card ${cls}"><div class="mark" aria-hidden="true">${mark}</div><h1>${esc(title)}</h1><p class="muted">${esc(text)}</p><div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="/">Home</a><a class="btn btn-outline" href="/contact">Contact us</a></div></div>`;
};

(async () => {
  const id = (param('id') || '').trim();
  if (!id) return msg('bad', '!', 'Certificate link is incomplete', 'Please open the link from your certificate email.');
  let cert;
  try { cert = await rpc('certificate_public', { p_code: id }); }
  catch { return msg('bad', '!', 'Could not load the certificate', 'Please check your internet connection and try again.'); }
  if (!cert?.found) return msg('bad', '✕', 'Certificate not found', 'This link is not valid. Please use the link from your email, or contact us.');
  if (cert.status === 'revoked') return msg('warn', '!', 'Certificate not available', 'This certificate has been withdrawn by Accounting Career Academy.');

  document.title = `${cert.name} — Certificate — Accounting Career Academy`;
  root.innerHTML = `
    <div class="cert-head">
      <span class="cert-badge">✔ Verified certificate</span>
      <h1>Congratulations, ${esc(cert.name)}!</h1>
      <p>${esc(cert.course_name)}</p>
    </div>
    <div class="cert-frame"><canvas id="cert-canvas" role="img" aria-label="Certificate of completion for ${esc(cert.name)}"></canvas></div>
    <div class="cert-actions">
      <button class="btn btn-primary" type="button" id="dl-pdf">Download PDF</button>
      <button class="btn btn-outline" type="button" id="dl-png">Download Image (PNG)</button>
      <a class="btn btn-linkedin" id="li" href="${esc(cert.linkedin_url)}" target="_blank" rel="noopener">Add to LinkedIn</a>
      <button class="btn btn-ghost" type="button" id="copy">Copy certificate link</button>
    </div>
    <p class="cert-note">“Add to LinkedIn” opens your LinkedIn profile with the certificate name, date, ID and verification link already filled in — just check and press <b>Save</b>. You can also upload the downloaded PDF/PNG as media there.</p>`;

  const canvas = $('#cert-canvas');
  try { await renderCertificate(canvas, cert); }
  catch (e) { msg('bad', '!', 'Could not draw the certificate', 'Please refresh the page or try another browser.'); return; }

  const name = safeFileName(cert);
  const busy = async (btn, fn) => {
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    try { await fn(); } catch (e) { toast('Download failed. Please try again.', 'error'); }
    btn.disabled = false; btn.textContent = old;
  };
  $('#dl-pdf').addEventListener('click', (e) => busy(e.currentTarget, async () => downloadBlob(await canvasToPdf(canvas), name + '.pdf')));
  $('#dl-png').addEventListener('click', (e) => busy(e.currentTarget, async () => downloadBlob(await canvasBlob(canvas), name + '.png')));
  $('#copy').addEventListener('click', () => copyText(verifyUrl(cert), 'Verification link copied'));
})();
