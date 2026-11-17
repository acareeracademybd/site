// Certificate drawing (canvas) + PNG / PDF export + QR code.
// Used by /certificate (student) and Admin → Certificates (preview).
// Everything runs in the browser; no external service, fonts or scripts are used.
import qrcode from './vendor/qrcode.js';

// Design space: 1000 × 707.6 units (same proportions as the A4 design you gave).
const W = 1000;
const H = 707.6;
const SCALE = 2; // 2000 × 1415 px output (sharp on screen and in print)

const NAVY = '#0A1F3F';
const GOLD = '#D39D25';
const GREY = '#697078';
const INK = '#2D323A';
const SANS = '"CertSans", "Inter", "Segoe UI", Arial, sans-serif';
const SERIF = '"CertSerif", Georgia, "Times New Roman", serif';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso || '');
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export const verifyUrl = (cert) => `${(cert.site_url || location.origin).replace(/\/$/, '')}/verify?id=${cert.code}`;

// ---------- assets ----------
const imgCache = {};
function loadImage(src) {
  imgCache[src] ||= new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not load ' + src));
    i.src = src;
  });
  return imgCache[src];
}

let fontsReady;
function loadFonts() {
  fontsReady ||= Promise.all([
    document.fonts.load(`700 30px "CertSerif"`),
    document.fonts.load(`400 14px "CertSans"`),
    document.fonts.load(`italic 400 14px "CertSans"`),
    document.fonts.load(`600 14px "CertSans"`),
    document.fonts.load(`700 14px "CertSans"`),
  ]).catch(() => {});
  return fontsReady;
}

// ---------- helpers ----------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draw text that is shrunk (never enlarged) until it fits maxW
function fitText(ctx, text, x, y, { size, min = 12, weight = 400, style = '', family = SANS, color = NAVY, align = 'center', maxW }) {
  let s = size;
  const set = () => { ctx.font = `${style} ${weight} ${s}px ${family}`.trim(); };
  set();
  while (ctx.measureText(text).width > maxW && s > min) { s -= 0.5; set(); }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}

function pair(ctx, label, value, size = 11.9) {
  ctx.font = `700 ${size}px ${SANS}`;
  const lw = ctx.measureText(label + ' ').width;
  ctx.font = `600 ${size}px ${SANS}`;
  const vw = ctx.measureText(value).width;
  return { label, value, lw, vw, w: lw + vw, size };
}

function drawPair(ctx, p, x, y) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = NAVY;
  ctx.font = `700 ${p.size}px ${SANS}`;
  ctx.fillText(p.label + ' ', x, y);
  ctx.font = `600 ${p.size}px ${SANS}`;
  ctx.fillText(p.value, x + p.lw, y);
}

// QR code → draws dark modules on a white plate
function drawQr(ctx, text, x, y, size) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = '#fff';
  roundRect(ctx, x, y, size, size, 4);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell * 100) / 100 + 0.15, Math.ceil(cell * 100) / 100 + 0.15);
    }
  }
}

// ---------- main drawing ----------
// cert: { name, course_name, batch, certificate_no, duration, course_area, completion_date, code, site_url }
export async function renderCertificate(canvas, cert) {
  await loadFonts();
  const [logo, sign] = await Promise.all([loadImage('/assets/certificate/logo.png'), loadImage('/assets/certificate/signature.png')]);

  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(H * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  // paper + double border
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
  ctx.strokeRect(18.8, 18.8, 962.4, 669.8);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.45;
  ctx.strokeRect(29.1, 29.1, 941.9, 649.3);

  // logo + headings
  ctx.drawImage(logo, 58.2, 47.1, 115.5, 115.5);
  fitText(ctx, 'ACCOUNTING CAREER ACADEMY', 500, 65.9, { size: 22.6, weight: 700, color: NAVY, maxW: 640 });
  fitText(ctx, 'CERTIFICATE OF COMPLETION', 500, 120.6, { size: 35.6, weight: 700, color: GOLD, maxW: 640 });
  ctx.fillStyle = GOLD; ctx.fillRect(269.5, 157.4, 462, 3);

  fitText(ctx, 'This certificate is proudly presented to', 500, 186.5, { size: 16.6, style: 'italic', color: GREY, maxW: 640 });
  fitText(ctx, String(cert.name || '').toUpperCase(), 500, 231.8, { size: 34.5, weight: 700, family: SERIF, color: NAVY, min: 18, maxW: 800 });
  ctx.fillStyle = GOLD; ctx.fillRect(171.1, 262.6, 658.7, 2.1);

  fitText(ctx, 'for successfully completing the', 500, 286.7, { size: 15.4, style: 'italic', color: GREY, maxW: 640 });
  fitText(ctx, String(cert.course_name || '').toUpperCase(), 500, 320, { size: 26.1, weight: 700, color: NAVY, min: 14, maxW: 800 });

  fitText(ctx, 'This certificate recognizes the participant’s successful completion of the course', 500, 373.2, { size: 13.7, color: INK, maxW: 800 });
  fitText(ctx, 'and participation in the learning activities conducted by Accounting Career Academy.', 500, 390, { size: 13.7, color: INK, maxW: 800 });

  // details box (rows with empty values are skipped, so the box always looks tidy)
  const row1 = [pair(ctx, 'Certificate No.:', String(cert.certificate_no || '—'))];
  if (cert.batch) row1.push(pair(ctx, 'Batch:', cert.batch));
  row1.push(pair(ctx, 'Completion Date:', formatDate(cert.completion_date)));
  const extra = [];
  if (cert.duration) extra.push(pair(ctx, 'Course Duration:', cert.duration));
  if (cert.course_area) extra.push(pair(ctx, 'Course Area:', cert.course_area));

  const rowH = 24;
  const boxH = 14 + (1 + extra.length) * rowH - 2;
  const boxX = 106.9; const boxW = 787; const boxY = 408;
  ctx.save();
  ctx.shadowColor = 'rgba(10,31,63,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#F4E2B2';
  roundRect(ctx, boxX, boxY, boxW, boxH, 11);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.95;
  roundRect(ctx, boxX, boxY, boxW, boxH, 11);
  ctx.stroke();

  // row 1: spread evenly across the inner width
  const innerL = boxX + 22; const innerR = boxX + boxW - 22;
  let y = boxY + 7 + rowH / 2;
  const total = row1.reduce((s, p) => s + p.w, 0);
  const gap = row1.length > 1 ? Math.max(14, (innerR - innerL - total) / (row1.length - 1)) : 0;
  let x = innerL;
  if (row1.length === 1) x = 500 - row1[0].w / 2;
  for (const p of row1) { drawPair(ctx, p, x, y); x += p.w + gap; }
  // other rows: centred
  for (const p of extra) {
    y += rowH;
    // shrink very long text so it stays inside the box
    while (p.w > boxW - 44 && p.size > 8) { p.size -= 0.3; Object.assign(p, pair(ctx, p.label, p.value, p.size)); }
    drawPair(ctx, p, 500 - p.w / 2, y);
  }

  // signature block (unchanged position from your design)
  ctx.drawImage(sign, 426.7, 503.7, 146.5, 51.5);
  ctx.fillStyle = NAVY; ctx.fillRect(384.5, 559.7, 231, 1.7);
  fitText(ctx, 'SADDAM HOSSAIN', 500, 572.6, { size: 14.3, weight: 700, color: NAVY, maxW: 230 });
  fitText(ctx, 'Instructor & CEO', 500, 586, { size: 11.9, color: GREY, maxW: 230 });
  fitText(ctx, 'Accounting Career Academy', 500, 601.5, { size: 11.9, color: GREY, maxW: 230 });

  // QR (left) + verification details (right)
  const url = verifyUrl(cert);
  drawQr(ctx, url, 112, 507, 96);
  fitText(ctx, 'Scan to verify', 160, 614, { size: 10.5, weight: 600, color: NAVY, maxW: 110 });
  const host = url.replace(/^https?:\/\//, '').replace(/\/verify.*$/, '');
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  fitText(ctx, 'Verification ID', 888, 534, { size: 10.5, weight: 600, color: GREY, align: 'right', maxW: 200 });
  fitText(ctx, String(cert.code || '').toUpperCase(), 888, 551, { size: 14.3, weight: 700, color: NAVY, align: 'right', maxW: 200 });
  fitText(ctx, `${host}/verify`, 888, 568, { size: 10.5, color: GREY, align: 'right', maxW: 200 });

  // footer
  fitText(ctx, 'Accounting Career Academy  •  Professional Learning & Career Development', 500, 639.4, { size: 10.5, color: GREY, maxW: 800 });
  fitText(ctx, `${cert.course_name || 'Accounting Executive Course'}  •  Certificate of Completion`, 500, 660.7, { size: 10.5, color: GREY, maxW: 800 });
  return canvas;
}

// ---------- export ----------
export const canvasBlob = (canvas, type = 'image/png', q = 0.95) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the image'))), type, q));

// Minimal single-page PDF (A4 landscape) holding the certificate as a JPEG
export async function canvasToPdf(canvas) {
  const jpg = new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.96)).arrayBuffer());
  const pw = 841.89; const ph = Math.round((841.89 * canvas.height / canvas.width) * 100) / 100;
  const enc = new TextEncoder();
  const parts = []; const offsets = []; let len = 0;
  const push = (d) => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); push(body); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = len;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  push(jpg);
  push('\nendstream\nendobj\n');
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = len;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const safeFileName = (cert) => `Certificate-${String(cert.certificate_no || '').replace(/[^\w-]+/g, '')}-${String(cert.name || '').trim().replace(/[^\w]+/g, '-')}`.replace(/-+$/, '');
