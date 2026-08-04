# Supabase Setup

This project uses Supabase for Postgres, Auth, and the Data API. All schema changes
live as SQL migrations in [`supabase/migrations/`](supabase/migrations) and are
applied with the Supabase CLI.

The Supabase CLI is installed as a dev dependency — run it with `npx supabase ...`.

## Schema overview

| Table | Purpose |
| --- | --- |
| `profiles` | 1:1 extension of `auth.users`; created automatically on signup |
| `sources` | Content sources (provider abstraction: `kind` = adapter, e.g. `reddit`) |
| `discussions` | Normalized discussion posts pulled from a source |
| `discussion_scores` | Per-discussion scores from the scoring engine (0..1) |
| `clusters` | Groups of related discussions (topic clustering) |
| `knowledge_base_items` | Distilled knowledge entries |
| `knowledge_base_embeddings` | pgvector embeddings for vector search (`vector(768)`) |
| `courses` | User-created courses / learning paths |
| `course_sections` | Ordered sections within a course |
| `course_discussion_matches` | Links course sections to discussions / knowledge items |

Every table is scoped to its owner via `user_id` and protected by **row-level
security**: users can only see and modify their own rows (see the final migration,
`20260803110000_rls_policies.sql`). New Supabase projects default to the
"always-revoked" grant behavior, so that migration also grants the necessary
privileges to the `authenticated` and `service_role` roles explicitly.

## Prerequisites

- Node.js 18+ (this project runs Node 24)
- The Supabase CLI is already a devDependency (`npx supabase --version`)
- **Local development** additionally needs Docker Desktop running

## Option A — Local development (recommended)

1. Copy the environment template and fill in values later from `supabase status`:
   ```bash
   cp .env.example .env.local
   ```

2. Start the local Supabase stack:
   ```bash
   npx supabase start
   ```

3. Apply all migrations (also resets the DB):
   ```bash
   npx supabase db reset
   ```

4. Grab the local keys and put them in `.env.local`:
   ```bash
   npx supabase status
   ```
   - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` → the `API URL` (e.g. `http://127.0.0.1:54321`)
   - `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the `anon key`
   - `SUPABASE_SERVICE_ROLE_KEY` → the `service_role key`

5. Run the app:
   ```bash
   npm run dev
   ```

## Option B — Hosted free-tier project

1. Create a free-tier project at <https://supabase.com/dashboard> (ignore the
   dashboard's "SQL Editor" — the migrations in this repo are the source of truth).

2. Link the project:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
   > `supabase login` opens a browser popup and therefore **must be run from an
   > interactive terminal** — it cannot complete from a non-TTY/automated shell.
   > If you don't have a terminal, use a personal access token instead:
   > `npx supabase login --token <token>` (create one in Dashboard → Account →
   > Access Tokens).

   Your project ref is the subdomain of your project URL:
   `https://<your-project-ref>.supabase.co`.

3. Push the migrations:
   ```bash
   npx supabase db push
   ```

4. Get the project keys from **Dashboard → Project Settings → API**, then create
   `.env.local` (copy from `.env.example` and fill in `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the two `NEXT_PUBLIC_*`
   Supabase vars).

## Regenerating TypeScript types

`src/types/database.types.ts` is the `supabase gen types` output, regenerated from
the **hosted** project (this CLI version has no `-o` flag, so stdout is redirected
to the file):

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.types.ts
```

For local development (Docker running, `supabase start`d):

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

The generated file drives the typed clients in `src/lib/supabase/`:
- `client.ts` — browser client (`createBrowserClient`, anon key, RLS applies)
- `server.ts` — server client for RSC/Server Actions (`createServerClient`, user's cookies)
- `admin.ts` — service-role client, **server-only** (`server-only` import), bypasses RLS

## Notes

- The `knowledge_base_embeddings.embedding` column is `vector(768)` to match
  Gemini `text-embedding-004`. If you switch embedding providers, update the
  migration and regenerate types.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser — it is only read in
  `admin.ts`, which is guarded by `import "server-only"`.
