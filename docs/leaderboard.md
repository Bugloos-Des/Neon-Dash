# Cosmo Leap — Supabase leaderboard

`cosmo-leap.html` can post a finished run to a Supabase table and show the
global top 10 on the start screen ("TOP PILOTS"), on game over, and on the
win screen.

The game talks to Supabase's REST (PostgREST) endpoint with plain `fetch`
rather than the `supabase-js` SDK, so the game stays a single
dependency-free file with no build step and no extra `<script>` tag.

## 1. Create the table

Run this once in the Supabase dashboard → **SQL Editor**:

```sql
create table public.cosmo_leap_scores (
  id         bigint generated always as identity primary key,
  name       text        not null,
  score      integer     not null,
  level      text,
  created_at timestamptz not null default now(),

  -- The client sanitizes these too, but anyone can POST here, so the
  -- database is what actually enforces them.
  constraint cosmo_leap_scores_name_ck  check (name ~ '^[A-Z0-9]{1,3}$'),
  constraint cosmo_leap_scores_score_ck check (score between 0 and 10000000),
  constraint cosmo_leap_scores_level_ck check (level is null or char_length(level) <= 8)
);

-- Matches the game's query: order by score desc, created_at asc, limit 10.
create index cosmo_leap_scores_rank_idx
  on public.cosmo_leap_scores (score desc, created_at asc);

alter table public.cosmo_leap_scores enable row level security;

-- Read the board, and add your own run. Nothing else: with no update or
-- delete policy, the anon role cannot change or remove any row.
create policy "anon can read scores"
  on public.cosmo_leap_scores for select to anon using (true);

create policy "anon can add a score"
  on public.cosmo_leap_scores for insert to anon with check (true);
```

## 2. Point the game at the project

In `cosmo-leap.html`, near the top of the `<script>` block:

```js
const SUPABASE_URL      = 'https://<project-ref>.supabase.co';
const SUPABASE_ANON_KEY = '<anon / publishable key>';
```

Both values are in the dashboard under **Project Settings → API**
(the key is labelled `anon` `public` on older projects, or
`sb_publishable_...` on newer ones — either works as-is).

Leave either string empty and the game runs exactly as it did before: the
TOP PILOTS button is hidden and no network call is ever made. That is the
state this file is committed in.

## 3. What is and isn't safe here

- **The anon key belongs in this file.** It is a publishable key: it
  identifies the project and grants nothing beyond what the RLS policies
  above allow. `cosmo-leap.html` is rsynced to the web server as-is, so
  anything in it is public — that's expected for this key, and fine.
- **Never put a `service_role` key in this file.** It bypasses RLS
  entirely. If one is ever pasted in and deployed, rotate it immediately.
- **Scores are not trustworthy.** Anyone can read the key out of the page
  and POST an arbitrary row; the constraints above bound what a forged row
  can contain, not whether it was earned. That's inherent to a leaderboard
  written straight from the client. If it ever matters, the fix is to move
  the insert behind an Edge Function that signs/validates the run, and drop
  the anon insert policy.
- **Other players' callsigns are rendered as text** (`textContent`, clipped
  to 3 chars), never as HTML, so a row can't inject markup into the page.

## 4. Housekeeping

The table grows without bound. To keep only the top 100 runs, schedule this
with `pg_cron` (or run it by hand now and then):

```sql
delete from public.cosmo_leap_scores
where id not in (
  select id from public.cosmo_leap_scores
  order by score desc, created_at asc
  limit 100
);
```

## 5. Checking it works

Open the deployed page, click **TOP PILOTS**:

- a list, or "No runs logged yet" → connected.
- "Leaderboard offline." → the request failed. Check the browser console
  for the status: `401`/`404` usually means a wrong key or a wrong table
  name; an empty list with no error means RLS is on but the select policy
  is missing.
