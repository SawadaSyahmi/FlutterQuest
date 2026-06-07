# Supabase Setup Guide

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates:

- `players`
- `tutorial_progress`
- `level_releases` for lecturer-controlled level release
- `tutorial-proofs` storage bucket
- public classroom RLS policies
- `flutter_quest_leaderboard` view

Use the anon/publishable key in `assets/js/config.js`. Do not use the service role key in browser code.

Quest upload is locked until Activity Proof is uploaded.


## Releasing levels one by one

By default, only Level 1 is released. To release Level 2, run this in Supabase SQL Editor:

```sql
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 2;
```

Change the `tutorial_id` number to release another level. Students should click **Refresh** on the game page after you release a new level.
