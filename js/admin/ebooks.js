// Admin → E-books (with secure PDF upload)
import { adminInit, must, esc, icon, money, statusBadge, slugOrGenerate, PUBLISH_OPTIONS, uploadPrivate, uploadPublic, toast } from '../admin.js';
import { crudPage } from './crud.js';

const { sb, content } = await adminInit('ebooks', 'E-books');
let files = new Map();

const pick = (accept) => new Promise((resolve) => {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = accept;
  inp.onchange = () => resolve(inp.files[0] || null);
  inp.click();
});

crudPage(content, {
  table: 'ebooks',
  order: [['sort_order', true], ['created_at', false]],
  reorderable: true,
  addLabel: 'Add E-book',
  wide: true,
  searchKeys: ['title', 'slug', 'author'],
  viewUrl: (b) => `/ebook/${b.slug}`,
  help: `<b>Paid PDF</b> (${icon('download', 'ico')} button) is stored privately — only students whose purchase is approved can download it, through a link that expires in 5 minutes.
         <b>Sample PDF</b> (${icon('eye', 'ico')} button) is public — use it for a few free preview pages.`,
  afterLoad: async () => {
    const rows = must(await sb.from('ebook_files').select('*'));
    files = new Map(rows.map((f) => [f.ebook_id, f]));
  },
  columns: [
    ['E-book', (b) => `<div style="display:flex;gap:10px;align-items:center"><img class="cover-sm" src="${esc(b.cover_url || '/assets/logo/logo-mark.svg')}" alt=""><div><b>${esc(b.title)}</b>${b.is_featured ? ' ★' : ''}<small>${esc(b.author || '')}${b.pages ? ' · ' + b.pages + ' pages' : ''}</small></div></div>`],
    ['Price', (b) => money(b.price)],
    ['Paid PDF', (b) => (files.get(b.id) ? `<span class="badge badge-success">Uploaded</span><small>${esc(files.get(b.id).file_name || '')}</small>` : '<span class="badge badge-warning">Not uploaded</span>')],
    ['Sample', (b) => (b.sample_url ? `<a href="${esc(b.sample_url)}" target="_blank" rel="noopener">View</a>` : '—')],
    ['Status', (b) => statusBadge(b.status)],
  ],
  extraActions: () => `<button type="button" class="icon-btn" data-action="pdf" title="Upload paid PDF">${icon('download')}</button>
    <button type="button" class="icon-btn" data-action="sample" title="Upload public sample PDF">${icon('eye')}</button>`,
  extraHandlers: (reload) => ({
    pdf: async (b) => {
      const file = await pick('application/pdf');
      if (!file) return;
      if (file.type && file.type !== 'application/pdf') throw new Error('Please choose a PDF file.');
      toast('Uploading ' + file.name + '… please wait', 'info', 120000);
      const path = await uploadPrivate('ebook-files', b.id, file);
      const old = files.get(b.id);
      must(await sb.from('ebook_files').upsert({ ebook_id: b.id, file_path: path, file_name: file.name, updated_at: new Date().toISOString() }));
      if (old?.file_path && old.file_path !== path) await sb.storage.from('ebook-files').remove([old.file_path]);
      toast('PDF uploaded securely ✓');
      await reload();
    },
    sample: async (b) => {
      const file = await pick('application/pdf');
      if (!file) return;
      toast('Uploading sample…', 'info', 60000);
      const url = await uploadPublic(file, 'samples');
      must(await sb.from('ebooks').update({ sample_url: url }).eq('id', b.id));
      toast('Sample uploaded');
      await reload();
    },
  }),
  defaults: { status: 'draft', price: 0, author: '' },
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'slug', label: 'URL name (slug)', hint: 'Leave empty to create automatically.' },
    { name: 'author', label: 'Author' },
    { name: 'pages', label: 'Number of pages', type: 'number' },
    { name: 'price', label: 'Price (৳)', type: 'number', required: true },
    { name: 'old_price', label: 'Old price (৳, optional)', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: PUBLISH_OPTIONS },
    { name: 'short_description', label: 'Short description (shown on cards)', type: 'textarea', rows: 2 },
    { name: 'description', label: 'Full description', type: 'rich', rows: 6 },
    { name: 'cover_url', label: 'Cover image (portrait 3:4, e.g. 600×800)', type: 'image', folder: 'covers' },
    { name: 'sample_url', label: 'Sample / preview PDF link (optional — or use the 👁 upload button in the list)', full: true },
    { name: 'is_featured', label: 'Show in "Popular e-books" on the homepage', type: 'checkbox' },
  ],
  beforeSave: (v) => { v.slug = slugOrGenerate(v.slug, v.title); v.price = v.price ?? 0; },
  deleteWarning: async (b) => {
    const { count } = await sb.from('ebook_purchases').select('id', { count: 'exact', head: true }).eq('ebook_id', b.id);
    return count ? `⚠️ ${count} student(s) bought this e-book and will lose access. Consider "Unpublish" instead.` : '';
  },
  afterDelete: async (b) => {
    const f = files.get(b.id);
    if (f?.file_path) await sb.storage.from('ebook-files').remove([f.file_path]);
  },
});
