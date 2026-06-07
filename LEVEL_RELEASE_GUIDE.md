# Level Release Guide

This version includes a server-side release flag for each tutorial level.

## What changed

A new Supabase table is created:

- `level_releases`

The web app reads this table before showing the levels. Students can only open and upload proof for levels where `is_released = true`.

By default:

- Level 1 is released.
- Levels 2–8 are locked.

## How to release a level

Go to **Supabase Dashboard > SQL Editor** and run:

```sql
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 2;
```

Change `tutorial_id = 2` to the level you want to release.

## How to lock a level again

```sql
update public.level_releases
set
  is_released = false,
  release_label = 'Locked by lecturer',
  released_at = null
where tutorial_id = 2;
```

## Quick check

```sql
select tutorial_id, title, is_released, release_label, released_at
from public.level_releases
order by tutorial_id;
```

The file `supabase/admin_release_examples.sql` also contains ready-to-run examples.
