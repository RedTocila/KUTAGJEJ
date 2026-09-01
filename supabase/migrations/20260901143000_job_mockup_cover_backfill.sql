-- Photo-less approved jobs always used the generated cover; mark them explicitly as mockup.
update public.job_listings
set cover_mode = 'mockup'
where cover_mode = 'image'
  and status = 'approved'
  and coalesce(array_length(image_urls, 1), 0) = 0;
