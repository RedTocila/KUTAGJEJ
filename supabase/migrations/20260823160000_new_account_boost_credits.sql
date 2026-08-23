-- New accounts start with 100 Boost Coins. Existing balances are unchanged.
alter table public.profiles
  alter column boost_credits set default 100;
