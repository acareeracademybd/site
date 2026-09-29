// Home page
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, emptyState, mountLiteVideo, safeUrl } from './utils.js';
import { courseCard, featuredCourseCard, ebookCard, testimonialCard, featureCard, postCard } from './ui.js';

const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
const safe = (p) => p.catch((e) => { console.warn(e); return null; });

(async () => {
  const settingsP = initLayout();
  const [settings, courses, features, ebooks, testimonials, posts] = await Promise.all([
    settingsP, safe(api.courses()), safe(api.features()), safe(api.ebooks({ featured: true, limit: 6 })),
    safe(api.testimonials()), safe(api.posts({ limit: 3 })),
  ]);
  const s = settings || {};

  if (s.hero_title) $('#hero-title').textContent = s.hero_title;
  if (s.hero_subtitle) $('#hero-subtitle').textContent = s.hero_subtitle;

  // Featured course: chosen in settings, else the course marked "featured", else the first
  const list = courses || [];
  const featured = list.find((c) => c.slug === s.featured_course_slug) || list.find((c) => c.is_featured) || list[0];
  fill('#featured-course', featured ? featuredCourseCard(featured) : '');

  fill('#features', features?.length ? features.map(featureCard).join('') : '');
  if (!features?.length) $('#features')?.closest('section')?.setAttribute('hidden', '');

  fill('#home-courses', list.slice(0, 6).map(courseCard).join('') || emptyState('Courses will be published soon.'));

  mountLiteVideo($('#demo-video'), s.youtube_video_url, 'Free demo class — Accounting Career Academy');
  if (s.youtube_channel_url) $('#yt-channel-btn').href = safeUrl(s.youtube_channel_url);

  fill('#home-ebooks', ebooks?.length ? ebooks.map(ebookCard).join('') : '');
  if (!ebooks?.length) $('#home-ebooks')?.closest('section')?.setAttribute('hidden', '');

  if (testimonials?.length) fill('#testimonials', testimonials.slice(0, 6).map(testimonialCard).join(''));
  else $('#testimonials-section').hidden = true;

  if (posts?.length) fill('#home-posts', posts.map(postCard).join(''));
  else $('#blog-section').hidden = true;

  if (s.site_name && s.tagline) document.title = `${s.site_name} — ${s.tagline}`;
})();
