// Admin → Testimonials
import { adminInit, esc, statusBadge, PUBLISH_OPTIONS } from '../admin.js';
import { crudPage } from './crud.js';

const { content } = await adminInit('testimonials', 'Testimonials');

crudPage(content, {
  table: 'testimonials',
  order: [['sort_order', true], ['created_at', false]],
  reorderable: true,
  labelKey: 'name',
  addLabel: 'Add Testimonial',
  searchKeys: ['name', 'designation', 'message'],
  help: 'Use real reviews from your students (with their permission). 3–6 published testimonials look best on the homepage.',
  columns: [
    ['Student', (t) => `<b>${esc(t.name)}</b><small>${esc(t.designation || '')}</small>`],
    ['Testimonial', (t) => `<span class="small">${esc(String(t.message).slice(0, 110))}${String(t.message).length > 110 ? '…' : ''}</span>`],
    ['Rating', (t) => '★'.repeat(t.rating || 5)],
    ['Status', (t) => statusBadge(t.status)],
  ],
  defaults: { status: 'published', rating: 5 },
  fields: [
    { name: 'name', label: 'Student name', required: true },
    { name: 'designation', label: 'Designation / company', placeholder: 'e.g. Accounts Executive, ABC Ltd.' },
    { name: 'message', label: 'Testimonial', type: 'textarea', required: true, rows: 4 },
    { name: 'rating', label: 'Rating', type: 'select', options: [[5, '★★★★★ (5)'], [4, '★★★★ (4)'], [3, '★★★ (3)'], [2, '★★ (2)'], [1, '★ (1)']] },
    { name: 'status', label: 'Status', type: 'select', options: PUBLISH_OPTIONS },
    { name: 'photo_url', label: 'Photo (optional, square)', type: 'image', folder: 'testimonials' },
  ],
  beforeSave: (v) => { v.rating = Number(v.rating) || 5; },
});
