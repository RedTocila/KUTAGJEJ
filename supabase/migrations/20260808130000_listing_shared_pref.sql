-- Grow/Elite share-lead notifications preference.

alter table public.user_notification_preferences
  add column if not exists listing_shared boolean not null default true;
