-- Who sent the latest message (for inbox delivered/delivered ticks).
alter table public.conversations
  add column if not exists last_message_sender_id uuid references public.profiles (id) on delete set null;

update public.conversations c
set last_message_sender_id = (
  select m.sender_id
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
)
where c.last_message_sender_id is null
  and exists (
    select 1 from public.messages m where m.conversation_id = c.id
  );
