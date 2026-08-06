# Database safety (KuTaGjej)

This project’s **live** Supabase database was wiped twice by re-running a destructive bootstrap SQL file (`init.sql` with `DROP TABLE … CASCADE`). Auth logins survived; listings, packages, coins, cities, and progress did not.

Use this doc so it does not happen again.

## Production vs local

| Environment | OK to reset? | Notes |
|---|---|---|
| Live Supabase (`ksemrbndoenxdxijokke`) | **No** | Real users and listings |
| Separate throwaway Supabase project | Yes | Use for `db reset` / experiments |
| Local Postgres only | Yes | Never point reset tools at prod URL |

## What caused the wipes

`supabase/migrations/20260801160000_init.sql` used to start with many:

```sql
DROP TABLE IF EXISTS public.… CASCADE;
```

Running that file (or pasting it) in the Supabase **SQL Editor** against production:

1. Dropped all app tables and their rows  
2. Recreated empty tables  
3. Left `auth.users` intact → users could still log in with empty dashboards  

That is not an app bug. It is a manual / agent SQL reset.

## Hard rules

1. **Never** run `init.sql` against production.  
2. **Never** `supabase db reset` against the live project.  
3. **Never** add `DROP TABLE` / `TRUNCATE` of app data tables to migrations or “repair” scripts.  
4. Schema changes = **new additive** migration files only.  
5. Before any live SQL: search the script for `DROP`, `TRUNCATE`, and unbounded `DELETE`.

## How to change schema safely

### New columns / tables

Create a new file:

```text
supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
```

Example:

```sql
alter table public.profiles
  add column if not exists some_flag boolean not null default false;
```

### Repairing a live DB that is missing columns

Prefer:

- `backend/scripts/repair-missing-schema.sql` (ALTERs only), or  
- A new additive migration  

Then data helpers if needed:

- `node backend/scripts/repair-db.js --data-only`  
- `node backend/scripts/restore-wiped-users.js` (entitlements only — cannot invent wiped listings)

Do **not** re-run init to “sync” schema.

## If data looks empty again

1. Check counts (listings, `user_subscriptions`, `profiles.boost_credits`) via service role — do not assume a UI bug.  
2. Check Supabase backups / **Point-in-Time Recovery** first if available.  
3. Only then use restore/seed scripts (partial recovery).

## Backups

Enable Supabase daily backups and, if possible, **PITR** on the live project so a bad SQL run can be rolled back instead of hand-restoring.

## Cursor / agents

Project rules:

- `.cursor/rules/supabase-db-safety.mdc` (always on)  
- `.cursor/rules/supabase-migrations.mdc` (when editing SQL / repair scripts)  

Agents must not open the SQL Editor and paste bootstrap or DROP-heavy SQL against production.
