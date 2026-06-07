# Flutter Quest: Activity Path + Quest Upload Edition

This version follows the handbook activity flow.

## Main design

Each tutorial level has:

1. Activity Path — students follow Activity 1, Activity 2, Activity 3, and so on.
2. Activity Upload — one screenshot/image after all activities are completed.
3. Quest Challenge — the tutorial extra activities become the quest.
4. Quest Upload — one screenshot/image after the quest is completed.

Only two uploads are required per tutorial.

## Setup

1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. Paste your Supabase URL and anon key into `assets/js/config.js`.
3. Open `index.html` using Live Server or deploy to GitHub Pages.

## Score

- Activity Upload: 60 points
- Quest Upload: 40 points
- Total: 100 points per tutorial


## Level release control

This version includes server-side level release flags through Supabase.

- New table: `level_releases`
- Default release setup: Level 1 is released, Levels 2–8 are locked.
- Students can only open and upload proof for released levels.
- To release the next level, update `is_released` in Supabase.

See `LEVEL_RELEASE_GUIDE.md` or `supabase/admin_release_examples.sql` for ready-to-run SQL commands.


## Full setup guide

For detailed setup, local run, Supabase connection, GitHub Pages deployment, and level release instructions, see `SETUP_AND_RUN_GUIDE.md`.
