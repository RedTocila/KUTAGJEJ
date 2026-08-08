-- Grow/Elite hot-interest (engagement combo) lead notifications preference.

alter table public.user_notification_preferences
  add column if not exists listing_hot_lead boolean not null default true;
