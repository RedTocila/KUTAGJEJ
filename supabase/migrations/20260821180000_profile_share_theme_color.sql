-- Accent color for listing share / save images, chosen on the public profile form.
alter table public.profiles
  add column if not exists share_theme_color text;
