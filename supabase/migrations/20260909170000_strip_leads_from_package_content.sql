-- Strip retired "Leads: …" marketing copy from package contract content.
-- Safe to re-run. Does not drop tables or delete rows.

update public.contracts
set
  content = trim(both ' ·' from regexp_replace(content, '\s*·\s*Leads:[^·]*', '', 'g')),
  updated_at = now()
where content ~* 'Leads:';
