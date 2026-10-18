// Course registration questions — shared by the checkout page and the Admin Panel.
// ⚠️ If you change these labels, change the same lists in supabase/registration-update.sql
//    (function submit_payment) so the database accepts them.

export const DEGREES = ['HSC', 'Diploma', 'Honours / BBA / B.Com', 'Masters / MBA / M.Com', 'Other'];
export const PROFESSIONS = ['ছাত্র/ছাত্রী', 'চাকরিজীবী', 'ব্যবসায়ী', 'চাকরিপ্রার্থী', 'Other'];
export const EXPERIENCE = ['নেই', '১ বছরের কম', '১ বছরের বেশি'];
export const SOURCES = ['Facebook', 'YouTube', 'পরিচিতজন', 'Other'];

// Batches are set per course in Website Settings (Supabase → website_settings table):
//   key   = batches_<course-slug>     e.g. batches_practical-accounts-executive-course
//   value = one batch per line         e.g. Batch – 05
export function batchesFor(settings, slug) {
  return String(settings?.['batches_' + slug] || '')
    .split('\n').map((x) => x.trim()).filter(Boolean);
}
