-- Vehicle category for car listings (car / suv / van / truck / motorcycle / boat).
alter table public.car_listings
  add column if not exists vehicle_type text not null default 'car';

create index if not exists car_listings_vehicle_type_idx on public.car_listings (vehicle_type);
