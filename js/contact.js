// Contact page form (saved to Admin → Messages)
import { initLayout } from './settings.js';
import { api } from './supabase.js';
import { $, esc, errorText } from './utils.js';

initLayout();

const form = $('#contact-form');
const alertBox = $('#contact-alert');
const show = (type, msg) => { alertBox.innerHTML = `<div class="alert alert-${type}">${esc(msg)}</div>`; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(data).forEach((k) => { data[k] = String(data[k]).trim(); });
  if (data.name.length < 2) return show('error', 'Please enter your name.');
  if (!/^(\+?880|0)?1[3-9]\d{8}$/.test(data.mobile.replace(/[\s-]/g, ''))) return show('error', 'Please enter a valid mobile number (01XXXXXXXXX).');
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return show('error', 'Please enter a valid email address.');
  if (data.message.length < 5) return show('error', 'Please write your message.');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api.submitContact(data);
    form.reset();
    show('success', 'ধন্যবাদ! আপনার মেসেজ পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।');
  } catch (err) {
    show('error', errorText(err));
  } finally {
    btn.disabled = false;
  }
});
