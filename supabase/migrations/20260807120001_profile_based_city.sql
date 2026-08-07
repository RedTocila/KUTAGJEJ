-- Home / “based in” city on profiles — used to prefill listing forms.
alter table public.profiles
  add column if not exists based_city_id uuid
    references public.real_estate_cities (id) on delete set null;

alter table public.profiles
  add column if not exists based_city_name text;
