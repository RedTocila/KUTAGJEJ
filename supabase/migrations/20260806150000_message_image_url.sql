-- Optional image attachment on chat messages.

alter table public.messages
  add column if not exists image_url text not null default '';
