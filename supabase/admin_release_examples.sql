-- Flutter Quest lecturer/admin release controls
-- Run these in Supabase Dashboard > SQL Editor.
-- Do not put these in browser JavaScript.

-- Check current level release status
select tutorial_id, title, is_released, release_label, released_at
from public.level_releases
order by tutorial_id;

-- Release Level 2
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 2;

-- Release the next level after Level 2
-- Change the number to 3, 4, 5, and so on when you are ready.
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 3;

-- Lock a level again if needed
update public.level_releases
set
  is_released = false,
  release_label = 'Locked by lecturer',
  released_at = null
where tutorial_id = 3;
