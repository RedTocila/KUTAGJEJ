-- Allow member-to-member chats that are not anchored to a listing
-- (e.g. contacting someone who saved your ad but has no active posts of their own).

alter table public.conversations
  alter column listing_kind drop not null;

alter table public.conversations
  alter column listing_id drop not null;

-- Who opened the thread: inquirer (listing contact) vs poster (saver outreach / direct).
alter table public.conversations
  add column if not exists started_by text not null default 'inquirer';

-- At most one listing-less thread per unordered pair of participants.
create unique index if not exists conversations_direct_pair_uidx
  on public.conversations (
    least(poster_id, inquirer_id),
    greatest(poster_id, inquirer_id)
  )
  where listing_id is null;
