-- One inbox thread per unordered participant pair (merge legacy per-listing duplicates).

create temp table conv_merge_map on commit drop as
with ranked as (
  select
    id,
    least(poster_id, inquirer_id) as user_a,
    greatest(poster_id, inquirer_id) as user_b,
    row_number() over (
      partition by least(poster_id, inquirer_id), greatest(poster_id, inquirer_id)
      order by last_message_at desc nulls last, updated_at desc, created_at desc
    ) as rn
  from public.conversations
)
select d.id as dupe_id, k.id as keep_id
from ranked d
join ranked k
  on d.user_a = k.user_a
 and d.user_b = k.user_b
 and k.rn = 1
where d.rn > 1;

-- Fold unread counts onto the kept row before deleting duplicates.
update public.conversations c
set
  poster_unread_count = c.poster_unread_count + agg.poster_sum,
  inquirer_unread_count = c.inquirer_unread_count + agg.inquirer_sum,
  updated_at = greatest(c.updated_at, now())
from (
  select
    m.keep_id,
    coalesce(sum(d.poster_unread_count), 0)::integer as poster_sum,
    coalesce(sum(d.inquirer_unread_count), 0)::integer as inquirer_sum
  from conv_merge_map m
  join public.conversations d on d.id = m.dupe_id
  group by m.keep_id
) agg
where c.id = agg.keep_id;

update public.messages msg
set conversation_id = m.keep_id
from conv_merge_map m
where msg.conversation_id = m.dupe_id;

update public.user_notifications n
set ref_id = m.keep_id
from conv_merge_map m
where n.ref_id = m.dupe_id;

delete from public.conversation_user_state s
using conv_merge_map m
where s.conversation_id = m.dupe_id;

delete from public.conversations c
using conv_merge_map m
where c.id = m.dupe_id;

-- Refresh preview fields from the latest message after merges.
update public.conversations c
set
  last_message_text = coalesce(
    nullif(left(trim(lm.body), 500), ''),
    case when lm.image_url is not null and trim(lm.image_url) <> '' then '📷 Foto' else '' end
  ),
  last_message_at = lm.created_at,
  last_message_sender_id = lm.sender_id,
  updated_at = greatest(c.updated_at, lm.created_at)
from (
  select distinct on (conversation_id)
    conversation_id,
    body,
    image_url,
    created_at,
    sender_id
  from public.messages
  order by conversation_id, created_at desc
) lm
where c.id = lm.conversation_id;

alter table public.conversations
  drop constraint if exists conversations_listing_kind_listing_id_inquirer_id_key;

drop index if exists public.conversations_direct_pair_uidx;

create unique index if not exists conversations_participant_pair_uidx
  on public.conversations (
    least(poster_id, inquirer_id),
    greatest(poster_id, inquirer_id)
  );
