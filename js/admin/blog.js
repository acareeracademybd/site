// Admin → Blog
import { adminInit, esc, statusBadge, slugOrGenerate, PUBLISH_OPTIONS, fmtDate } from '../admin.js';
import { crudPage } from './crud.js';

const { content } = await adminInit('blog', 'Blog');
const CATEGORIES = ['Accounting', 'Tally Prime', 'Excel', 'Career', 'VAT & Tax', 'Practical Accounting', 'Job Preparation'];

crudPage(content, {
  table: 'blog_posts',
  order: [['published_at', false], ['created_at', false]],
  addLabel: 'New Post',
  wide: true,
  searchKeys: ['title', 'category', 'author'],
  viewUrl: (p) => `/blog/${p.slug}`,
  columns: [
    ['Post', (p) => `<div style="display:flex;gap:10px;align-items:center"><img class="thumb-sm" src="${esc(p.featured_image || '/assets/logo/logo-mark.svg')}" alt=""><div><b>${esc(p.title)}</b><small>/blog/${esc(p.slug)}</small></div></div>`],
    ['Category', (p) => esc(p.category)],
    ['Date', (p) => fmtDate(p.published_at)],
    ['Status', (p) => statusBadge(p.status)],
  ],
  defaults: { status: 'draft', category: 'Accounting', published_at: new Date().toISOString().slice(0, 10), author: '' },
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'slug', label: 'URL name (slug)', hint: 'Leave empty to create automatically.' },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES.map((c) => [c, c]) },
    { name: 'author', label: 'Author' },
    { name: 'published_at', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', options: PUBLISH_OPTIONS },
    { name: 'featured_image', label: 'Featured image (16:9)', type: 'image', folder: 'blog' },
    { name: 'short_description', label: 'Short description (shown on cards & Google)', type: 'textarea', rows: 2 },
    { name: 'content', label: 'Content', type: 'rich', rows: 16 },
  ],
  beforeSave: (v) => { v.slug = slugOrGenerate(v.slug, v.title); },
});
