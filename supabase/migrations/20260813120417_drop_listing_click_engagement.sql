-- Stop accepting listing click engagement. Views, shares, and saves remain.
-- Keeps click_count column for historical data (unused going forward).
create or replace function public.increment_listing_engagement(
  p_listing_kind text,
  p_listing_id uuid,
  p_event text
)
returns table (
  view_count integer,
  click_count integer,
  share_count integer
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
    click_count,
    share_count
  )
  values (
    p_listing_kind,
    p_listing_id,
    case when p_event = 'view' then 1 else 0 end,
    0,
    case when p_event = 'share' then 1 else 0 end
  )
  on conflict (listing_kind, listing_id) do update
  set
    view_count = listing_engagements.view_count + excluded.view_count,
    share_count = listing_engagements.share_count + excluded.share_count,
    updated_at = now()
  returning
    listing_engagements.view_count,
    listing_engagements.click_count,
    listing_engagements.share_count;
end;
$$;

revoke execute on function public.increment_listing_engagement(text, uuid, text) from public;
revoke execute on function public.increment_listing_engagement(text, uuid, text) from anon;
revoke execute on function public.increment_listing_engagement(text, uuid, text) from authenticated;
grant execute on function public.increment_listing_engagement(text, uuid, text) to service_role;
