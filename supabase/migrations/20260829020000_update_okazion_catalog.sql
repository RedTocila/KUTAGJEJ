-- Update the existing OKAZION catalog entry while preserving historical purchase prices.
update public.addon_packages
set
  days = 7,
  price_eur = 19,
  price_bc = 250,
  label_sq = '7 ditë OKAZION',
  label_en = '7 Days OKAZION Listing',
  updated_at = now()
where id = 'okazion-5'
  and kind = 'okazion';

-- Give previously purchased OKAZION vouchers the new duration.
-- Keep their recorded prices unchanged because those are historical payments.
do $$
declare
  voucher record;
  listing_table text;
begin
  for voucher in
    select listing_kind, listing_id
    from public.okazion_listing_vouchers
    where package_id = 'okazion-5'
      and source in ('card', 'boost_coins')
      and status = 'applied'
      and days = 5
  loop
    listing_table := case voucher.listing_kind
      when 'real-estate' then 'real_estate_listings'
      when 'car' then 'car_listings'
      when 'job' then 'job_listings'
      when 'marketplace' then 'marketplace_listings'
      else null
    end;

    if listing_table is not null and voucher.listing_id is not null then
      execute format(
        'update public.%I
         set okazion_until = okazion_until + interval ''2 days''
         where id = $1
           and okazion_until is not null
           and okazion_until > now()',
        listing_table
      ) using voucher.listing_id;
    end if;
  end loop;
end
$$;

update public.okazion_listing_vouchers
set
  days = 7,
  updated_at = now()
where package_id = 'okazion-5'
  and source in ('card', 'boost_coins')
  and status in ('unused', 'applied')
  and days = 5;

-- Keep the included Grow / Elite plan descriptions aligned with the new duration.
update public.contracts
set content = replace(content, 'OKAZION (5 days)', 'OKAZION (7 days)')
where plan_code in ('grow', 'elite')
  and content like '%OKAZION (5 days)%';
