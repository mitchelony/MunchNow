-- Safe, additive migration for Google Places photo metadata on public.places
-- 1) Keep existing columns untouched
-- 2) Add new nullable columns
-- 3) Add optional uniqueness for google_place_id (ignores NULL)
-- 4) Constrain photo_source values to yelp|google|manual

begin;

alter table public.places
  add column if not exists google_place_id text,
  add column if not exists photo_source text,
  add column if not exists photo_updated_at timestamptz;

create unique index if not exists places_google_place_id_unique
  on public.places (google_place_id)
  where google_place_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'places_photo_source_check'
      and conrelid = 'public.places'::regclass
  ) then
    alter table public.places
      add constraint places_photo_source_check
      check (photo_source in ('yelp', 'google', 'manual'));
  end if;
end $$;

commit;

