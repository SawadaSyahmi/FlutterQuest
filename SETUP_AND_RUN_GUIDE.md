# Flutter Quest Setup and Run Guide

This guide explains how to run the Flutter Quest game website, connect it to Supabase, and release tutorial levels one by one.

## 1. What you need

You only need:

- A Supabase account
- VS Code, or any code editor
- A local web server such as VS Code Live Server, or Python `http.server`
- Internet connection, because the page loads the Supabase JavaScript library from a CDN

This project is a static website. There is no Node.js build step and no Flutter build step for the game website itself.

## 2. Unzip the project

Unzip the file and open this folder:

```text
flutter_quest_activity_quest_two_uploads
```

Inside the folder, you should see:

```text
index.html
assets/
  css/style.css
  js/app.js
  js/config.js
supabase/
  schema.sql
  admin_release_examples.sql
README.md
README_SUPABASE_SETUP.md
LEVEL_RELEASE_GUIDE.md
```

## 3. Create the Supabase backend

Go to Supabase and create a new project.

After the project is ready:

1. Open **Supabase Dashboard**.
2. Go to **SQL Editor**.
3. Open the file `supabase/schema.sql` from this project.
4. Copy all SQL content.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

The SQL setup creates:

- `players` table
- `tutorial_progress` table
- `level_releases` table
- `tutorial-proofs` storage bucket
- public classroom policies
- `flutter_quest_leaderboard` view

By default, Level 1 is released and Levels 2 to 8 are locked.

## 4. Connect the website to Supabase

In Supabase:

1. Go to **Project Settings**.
2. Go to **API**.
3. Copy the **Project URL**.
4. Copy the **anon** or **publishable** key.

Then open:

```text
assets/js/config.js
```

Replace the placeholder values:

```js
window.FLUTTER_QUEST_SUPABASE = {
  url: "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE",
  anonKey: "PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE"
};
```

Example format:

```js
window.FLUTTER_QUEST_SUPABASE = {
  url: "https://your-project-id.supabase.co",
  anonKey: "your-anon-or-publishable-key"
};
```

Important: Do not paste the service role key into this file. Browser code must only use the anon or publishable key.

## 5. Run locally

### Option A: Run using VS Code Live Server

1. Open the project folder in VS Code.
2. Install the **Live Server** extension if you do not have it.
3. Right-click `index.html`.
4. Click **Open with Live Server**.

The game should open in your browser.

### Option B: Run using Python local server

Open a terminal in the project folder and run:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

On Windows, if `python` does not work, try:

```bash
py -m http.server 5500
```

## 6. Check that the backend is connected

On the game page, look at the backend status message.

If setup is correct, it should show:

```text
Online mode: Supabase connected.
```

If it shows offline mode, check these items:

- `assets/js/config.js` has the correct Supabase URL.
- `assets/js/config.js` has the anon or publishable key, not the service role key.
- You ran `supabase/schema.sql` successfully.
- Your browser has internet access.

## 7. Test as a student

1. Open the game page.
2. Enter a player name.
3. Enter a group name if needed.
4. Click **Start Adventure**.
5. Open Level 1.
6. Follow the activities.
7. Upload one image for the Activity Proof.
8. Upload one image for the Quest Proof.

After upload, check Supabase:

- **Table Editor > players** should show the player.
- **Table Editor > tutorial_progress** should show the activity and quest completion.
- **Storage > tutorial-proofs** should show uploaded images.

## 8. Release levels one by one

To check current level status, run this in Supabase SQL Editor:

```sql
select tutorial_id, title, is_released, release_label, released_at
from public.level_releases
order by tutorial_id;
```

To release Level 2:

```sql
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 2;
```

To release Level 3, change the number:

```sql
update public.level_releases
set
  is_released = true,
  release_label = 'Released',
  released_at = coalesce(released_at, now())
where tutorial_id = 3;
```

After releasing a level, ask students to click **Refresh** on the game page.

## 9. Lock a level again

To lock a level again:

```sql
update public.level_releases
set
  is_released = false,
  release_label = 'Locked by lecturer',
  released_at = null
where tutorial_id = 3;
```

Change `tutorial_id = 3` to the level you want to lock.

## 10. View leaderboard data

Run this in Supabase SQL Editor:

```sql
select *
from public.flutter_quest_leaderboard;
```

The score is calculated as:

```text
Activity Upload = 60 points
Quest Upload = 40 points
Total per level = 100 points
```

## 11. Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload the files inside `flutter_quest_activity_quest_two_uploads`.
3. Go to the repository **Settings**.
4. Go to **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/root` folder.
7. Save.
8. Open the GitHub Pages link once it is published.

Make sure `assets/js/config.js` is already updated before deploying.

## 12. Reset classroom data

Use this only when you want to clear all players and progress.

```sql
truncate table public.tutorial_progress restart identity cascade;
truncate table public.players restart identity cascade;
```

This clears table data only. Uploaded images inside the `tutorial-proofs` bucket may still remain and can be deleted from **Supabase Dashboard > Storage**.

## 13. Common problems

### Problem: The game says offline mode

Check `assets/js/config.js`. The URL and anon key are probably still placeholders or copied incorrectly.

### Problem: Upload failed

Check that the `tutorial-proofs` bucket exists. It should be created automatically when you run `supabase/schema.sql`.

Also make sure the uploaded image is below 5 MB.

### Problem: Students cannot see the newly released level

Ask them to click **Refresh** in the game. If it still does not appear, run the level status SQL check again.

### Problem: GitHub Pages works, but upload does not

Check the browser console for errors. The most common cause is an incorrect Supabase URL or anon key in `assets/js/config.js`.

## 14. Recommended classroom flow

Before class:

1. Run the Supabase SQL setup.
2. Update `assets/js/config.js`.
3. Test Level 1 upload.
4. Deploy to GitHub Pages.

During class:

1. Give students the game link.
2. Let them complete Level 1.
3. Check progress in Supabase or the leaderboard.
4. Release Level 2 when ready.
5. Repeat until the final level.
