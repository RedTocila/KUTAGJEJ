-- Keep public save counts with listing engagement rows so reads do not scan
-- saved_listings for every listing card.
alter table public.listing_engagements
  add column if not exists save_count integer not null default 0;

-- Backfill existing saves, including listings that never had an engagement row.
insert into public.listing_engagements (listing_kind, listing_id, save_count)
select listing_kind, listing_id, count(*)::integer
from public.saved_listings
group by listing_kind, listing_id
on conflict (listing_kind, listing_id) do update
set save_count = excluded.save_count,
    updated_at = now();

-- Return the stored save count from view/share increments too, avoiding a
-- second saved-listings query for every engagement event.
drop function if exists public.increment_listing_engagement(text, uuid, text);

create function public.increment_listing_engagement(
  p_listing_kind text,
  p_listing_id uuid,
  p_event text
)
returns table (
  view_count integer,
  share_count integer,
  save_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_event not in ('view', 'share') then
    raise exception 'Invalid listing engagement event: %', p_event;
  end if;

  return query
  insert into public.listing_engagements (
    listing_kind,
    listing_id,
    view_count,
    share_count,
    save_count
  )
  values (
    p_listing_kind,
    p_listing_id,
    case when p_event = 'view' then 1 else 0 end,
    case when p_event = 'share' then 1 else 0 end,
    0
  )
  on conflict (listing_kind, listing_id) do update
  set
    view_count = public.listing_engagements.view_count + excluded.view_count,
    share_count = public.listing_engagements.share_count + excluded.share_count,
    updated_at = now()
  returning
    public.listing_engagements.view_count,
    public.listing_engagements.share_count,
    public.listing_engagements.save_count;
end;
$$;

revoke execute on function public.increment_listing_engagement(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.increment_listing_engagement(text, uuid, text)
  to service_role;

create or replace function public.increment_listing_save_count(
  p_listing_kind text,
  p_listing_id uuid,
  p_delta integer
)
returns table(save_count integer)
language sql
security definer
set search_path = public
as $$
  insert into public.listing_engagements (
    listing_kind,
    listing_id,
    save_count
  )
  values (
    p_listing_kind,
    p_listing_id,
    greatest(-1, least(1, p_delta))
  )
  on conflict (listing_kind, listing_id) do update
  set save_count = greatest(
        0,
        public.listing_engagements.save_count + excluded.save_count
      ),
      updated_at = now()
  returning public.listing_engagements.save_count;
$$;

revoke execute on function public.increment_listing_save_count(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.increment_listing_save_count(text, uuid, integer)
  to service_role;
