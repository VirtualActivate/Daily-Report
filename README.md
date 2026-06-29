# Daily report hub — setup guide

This is a working Next.js + Supabase app: real database, real URL, works from any
device (your laptop, the timekeeper's phone) and stays in sync because everyone
is reading/writing the same database.

No login is set up — anyone with the URL can use it. Keep the link private.

## What you're setting up

1. A free Supabase project (the database)
2. This code deployed to Vercel (free hosting, gives you the URL)

Takes about 15 minutes the first time.

## Step 1 — Create your Supabase project

1. Go to https://supabase.com and sign up (free tier is enough for this).
2. Click "New project". Pick any name (e.g. "construct-iq-daily-report"),
   set a database password (save it somewhere), pick the region closest to
   Dubai (e.g. Mumbai or Singapore), and create the project. Takes ~2 minutes
   to provision.
3. Once it's ready, go to the **SQL Editor** tab in the left sidebar.
4. Click "New query", paste in the entire contents of `sql/schema.sql` from
   this project, and click "Run". This creates all the tables and adds your
   4 projects plus the Mirdif subcontractor list.
5. Go to **Project Settings > API** (gear icon, bottom of left sidebar).
   You need two values from this page:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

Keep this tab open, you'll paste these into Vercel in step 3.

## Step 2 — Push this code to GitHub

Vercel deploys from a GitHub repository. If you don't already have this code
in a repo:

1. Go to https://github.com/new, create a new repository (can be private).
2. On your computer, in this project folder, run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-new-repo-url>
   git push -u origin main
   ```

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com and sign up (free tier is enough), ideally using
   "Continue with GitHub" so it can see your repos.
2. Click "Add New... > Project", select the repository you just pushed.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → paste your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste your Supabase anon public key
4. Click **Deploy**. Takes about a minute.
5. You'll get a URL like `https://construct-iq-daily-report.vercel.app`.
   That's the link you share with the timekeeper.

## Using it day to day

- Open the URL on any device — phone, laptop, tablet. No app install needed.
- First time: go to **Masters** and add your real space lists (Site Area /
  Level / Zone / Space ID) for each project, plus your foremen.
- The timekeeper uses **Daily entry** every day.
- You check **Dashboard** for progress.
- You check **Overlaps** periodically to catch any apartment + trade that
  has been logged by more than one company, at any point in time, even
  months apart. This deliberately also surfaces normal handovers (Crew A did
  First Fix, Crew B legitimately did Second Fix later) alongside genuine
  duplicate or conflicting assignments — it's a "worth a look" list, not an
  accusation. Review each row before acting on it.

Everyone sees the same live data because it's all stored in Supabase, not on
any one device.

## If you want to make a change to the app later

Edit the code, commit, and push to GitHub (`git add . && git commit -m "..."
&& git push`). Vercel automatically redeploys within a minute or two — no
manual redeploy step needed.

## Local development (optional, only if you want to test changes on your
   computer before pushing)

```
npm install
cp .env.example .env.local
# edit .env.local and fill in your real Supabase URL and anon key
npm run dev
```
Then open http://localhost:3000

## A note on `npm audit`

Running `npm audit` will show one moderate-severity warning about a `postcss`
version bundled inside Next.js itself (a build-time-only XSS advisory in
PostCSS's CSS output, not exploitable at runtime). This is a known, currently
unfixed issue inside Next.js's own dependency tree — not something this
project can resolve from its own `package.json`.

**Do not run `npm audit fix --force`** — it will downgrade Next.js to an old
2020-era release (9.3.3) and break the app. Leave this one warning as-is;
it will resolve itself the next time Next.js ships a patch that updates its
internal postcss dependency.

## Notes on the no-login setup

Since there's no login screen, treat the Vercel URL like a shared document
link — anyone who has it can view and edit all data across all 4 projects.
If you ever want to add a simple password gate or real per-user logins,
that's a contained addition (Supabase has built-in auth) and doesn't require
rebuilding anything else in this app.
