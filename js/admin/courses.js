// Admin → Courses
import { adminInit, esc, icon, money, statusBadge, slugOrGenerate, PUBLISH_OPTIONS, sb } from '../admin.js';
import { crudPage } from './crud.js';

const { content } = await adminInit('courses', 'Courses');

crudPage(content, {
  table: 'courses',
  order: [['sort_order', true], ['created_at', false]],
  reorderable: true,
  addLabel: 'Add Course',
  wide: true,
  searchKeys: ['title', 'slug', 'course_type'],
  viewUrl: (c) => `/course/${c.slug}`,
  help: `Each course has a public page. Add the lessons in <a href="/admin/lessons">Modules / Lessons</a>. A course is visible on the website only when its status is <b>Published</b>.`,
  columns: [
    ['Course', (c) => `<div style="display:flex;gap:10px;align-items:center"><img class="thumb-sm" src="${esc(c.thumbnail_url || '/assets/logo/logo-mark.svg')}" alt=""><div><b>${esc(c.title)}</b>${c.is_featured ? ' <span title="Featured">★</span>' : ''}<small>/course/${esc(c.slug)}</small></div></div>`],
    ['Type', (c) => (c.course_type === 'live' ? '<span class="badge badge-live">Live</span>' : '<span class="badge">Recorded</span>')],
    ['Price', (c) => money(c.price)],
    ['Duration', (c) => esc(c.duration || '—')],
    ['Status', (c) => statusBadge(c.status)],
  ],
  extraActions: (c) => `<a class="icon-btn" href="/admin/lessons?course=${esc(c.id)}" title="Modules & lessons">${icon('list')}</a>`,
  defaults: { course_type: 'recorded', status: 'draft', instructor: '', price: 0 },
  fields: [
    { name: 'title', label: 'Course Name', required: true, full: true },
    { name: 'slug', label: 'URL name (slug)', hint: 'Small English letters, numbers and dashes. Leave empty to create automatically from the name.', placeholder: 'e.g. tally-prime-practical-course' },
    { name: 'course_type', label: 'Course Type', type: 'select', options: [['recorded', 'RECORDED'], ['live', 'LIVE']] },
    { name: 'price', label: 'Price (৳)', type: 'number', required: true },
    { name: 'old_price', label: 'Old price (৳, optional — shown crossed out)', type: 'number' },
    { name: 'duration', label: 'Duration', placeholder: 'e.g. 3 months · 24 live classes' },
    { name: 'level', label: 'Level', placeholder: 'e.g. Beginner to Advanced' },
    { name: 'instructor', label: 'Instructor' },
    { name: 'status', label: 'Status', type: 'select', options: PUBLISH_OPTIONS },
    { name: 'short_description', label: 'Short Description (1–2 sentences, shown on cards)', type: 'textarea', rows: 2 },
    { name: 'full_description', label: 'Full Description (Course overview)', type: 'rich', rows: 8 },
    { name: 'thumbnail_url', label: 'Thumbnail (16:9 image, e.g. 1280×720)', type: 'image', folder: 'courses' },
    { name: 'preview_video_url', label: 'Free preview video (YouTube link, optional)', full: true, placeholder: 'https://www.youtube.com/watch?v=...' },
    { name: 'what_you_learn', label: 'What students will learn', type: 'lines' },
    { name: 'who_should_join', label: 'Who should join', type: 'lines' },
    { name: 'benefits', label: 'Key benefits (shown on the featured course card)', type: 'lines' },
    { name: 'schedule_days', label: 'LIVE only — Class days', placeholder: 'e.g. Friday & Saturday' },
    { name: 'class_time', label: 'LIVE only — Class time', placeholder: 'e.g. 8:00 PM – 10:00 PM' },
    { name: 'start_date', label: 'LIVE only — Batch start date', type: 'date' },
    { name: 'platform', label: 'LIVE only — Platform', placeholder: 'Zoom / Google Meet' },
    { name: 'is_featured', label: 'Featured course (show on homepage)', type: 'checkbox' },
  ],
  beforeSave: (v) => {
    v.slug = slugOrGenerate(v.slug, v.title);
    v.price = v.price ?? 0;
  },
  deleteWarning: async (c) => {
    const { count } = await sb.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', c.id);
    return count ? `⚠️ ${count} student(s) are enrolled in this course. Deleting it removes their access and all lessons. Consider "Unpublish" instead.` : 'All modules and lessons of this course will also be deleted.';
  },
});
