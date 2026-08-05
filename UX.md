# Sift — Complete User Guide & Screen-by-Screen Walkthrough

This document explains every screen in the app, what it does, how to use it, and how the
screens flow into each other. It assumes you have already deployed the app (Vercel) and
configured the environment variables from `.env.example` / SETUP.md.

> Tip: open the app in a desktop browser for the best experience. A light-blue
> (light) / navy-black (dark) theme is used throughout; toggle it with the sun/moon
> button in the top-right header.

---

## 1. The big picture (what Sift does)

Sift turns Reddit discussions into structured, scored, decision-ready knowledge.

The data flow is:

```
Add Reddit sources  →  Import posts  →  Enrich (summarise + keyword + signals)
        ↓                                   ↓
   Dashboard overview                  Knowledge base uploads
   (priority / trends / gaps)     →   Compare discussions against KB
        ↓                                   ↓
   Course mapper               Discussion detail page
   (match content,               (score breakdown, recommended action,
    find new lesson ideas)       response outline, content ideas)
```

Every screen below plugs into one part of that flow.

---

## 2. Authentication (Sign in / Sign up)

**Route:** `/sign-in` (the root `/` redirects here when you are logged out)

The landing card has two tabs:

### Sign in tab

- **Email + password** — enter your email and password, press **Sign in**.
- **or continue with a magic link** — enter just your email and press
  **Continue with a magic link**. Sift emails you a link; clicking it signs you in
  without a password.

### Sign up tab

- **Create account** — enter your email, a password, and confirm it. After signing up
  you land on the Dashboard.

Once signed in you are redirected to `/dashboard`. Signing out (Account screen or the
header) returns you to `/sign-in`.

---

## 3. Dashboard (main screen)

**Route:** `/dashboard` — the home you land on after signing in.

It has four stacked sections, top to bottom:

### 3a. Title bar + "Import Reddit posts" button

- Shows live totals: `N discussions · N enriched · N sources · N courses`.
- **Import Reddit posts** button → runs the import pipeline immediately against every
  configured source. A toast reports what happened per source
  (imported N / deduped N / skipped because recently synced / error).

### 3b. Overview cards (4 cards)

1. **Most active sources** — sources with discussions published today. Click a source to
   jump to the filtered discussions list.
2. **Top priority** — the highest-scoring discussions. Click to open the discussion detail.
3. **Trending topics** — topics with rising volume/engagement. Click a topic to filter the
   list to that topic.
4. **Opportunities** — high buying-intent, low-competition picks. Click to open the detail.

If data is missing, each card shows a short "run the pipeline" hint instead of an error.

### 3c. Reddit Sources manager

See **Section 5** for full details.

### 3d. Discussions section (filters + table)

See **Section 6** for full details.

---

## 4. Header (present on all dashboard pages)

A fixed translucent bar with:

- **Sift** logo → Dashboard.
- Nav links: **Dashboard · Account · Knowledge base · Courses · Health**.
- **Sun/moon** button → toggles light/dark theme.
- **Get a Quote** button → outline CTA (currently a placeholder).
- On mobile the nav collapses behind a hamburger menu.

---

## 5. Reddit Sources manager

**Where:** Dashboard, middle section, "Reddit Sources" card.

This controls _where_ content comes from.

### Add a source

1. Fill **Source name** (e.g. "Programming feeds").
2. Fill **Subreddits (comma-separated)** (e.g. `programming, typescript, rust`).
   Names are normalised automatically (lowercase, no `r/` prefix).
3. Press **Add source**. A toast confirms success.

### What a source row shows

- Source kind badge + name.
- Its subreddits (`r/programming, r/typescript, …`).
- Status badge (enabled / disabled) and last-sync date.

### Delete a source

Press the trash icon on the row, confirm the dialog. Deleting a source stops future
imports for it.

---

## 6. Discussions list + filters

**Where:** Dashboard, bottom section, "Discussions" card + table.

### Filters (top bar)

- **Source** — restrict to one source (or "All sources").
- **Category** — restrict to a category.
- **Min priority / Max priority** — numeric score range (0–100).
- **From / To** — date range.
- **KB coverage** — All / Answered / Partially covered / Gap / Not compared.
- **Sort by** — Priority score or Published date, with an up/down toggle for direction.

The **Topic** chip appears when a topic was selected from the Overview; use **Reset filters**
to clear everything.

### The table

Each row shows: title (+ summary), source, category, **Priority** badge, **KB** coverage
badge, engagement (comments · points), and published date. Row count is shown above the
table. Use **Previous / Next** to page.

Click any discussion title to open the **Discussion detail** (Section 7).

---

## 7. Discussion detail

**Route:** `/dashboard/discussions/[id]` (reached from the table, overview, or anywhere a
title is linked).

### Header

Title, source, subreddit, author, published time, comment/point counts, and an
**Open original** link to the Reddit thread.

### Cards (2×2 grid)

1. **Summary** — generated summary, category badge, keyword chips, and a collapsible
   "Read the full post".
2. **Priority score** — the 0–100 score plus a **per-factor breakdown**:
   Buying intent · Urgency · Low competition · Visibility · Engagement · Topic growth,
   each shown as a progress bar. Below it: the written reasoning, provider/model, and
   confidence.
3. **Knowledge base coverage** — Answered / Partially covered / Gap / Not compared, with the
   best-matching excerpt if one exists.
4. **Recommended action** — a coloured badge (Action / Create / Expand / Watch) with the
   reason.

### Second row

5. **Suggested response outline** — step-by-step skeleton for replying in-thread.
6. **Content ideas** — Blog / FAQ / Newsletter / Course angles, each with a reason.

### Bottom card

**Course-section matches** — every course section/lesson this discussion maps to, with match
scores. A **Manage courses** link jumps to the Courses screen.

---

## 8. Knowledge base

**Route:** `/dashboard/knowledge-base`

Uploads your own documents so Sift can tell whether discussions are already answered.

### Upload a document

Supports PDF, Markdown, or plain text. Files go into your private Supabase Storage bucket;
the server extracts text, chunks it, and embeds it.

### Documents list

Each file shows name, type, chunk count, character count, and processing status.

### Discussion coverage

- Press **Refresh coverage** to re-run the semantic comparison of all enriched discussions
  against your documents.
- The list shows every discussion with a coverage badge: **Answered** (green/blue),
  **Partially covered** (cyan), **Gap** (red), or **Not compared**.

Flow: upload docs → refresh coverage → see gaps on the Dashboard and filter by them.

---

## 9. Courses (Course mapper)

**Route:** `/dashboard/courses`

Defines courses and matches them to discussions, turning recurring gaps into lessons.

### New course / Import outline

- **New course** — create a blank course.
- **Import outline** — paste a Markdown outline (`# / ## / ###` headings) or a CSV
  (`section,title,content`) to build the course structure automatically.

### Match course content

Press **Refresh matches** to embed every section/lesson and find the closest one for each
enriched discussion.

### Courses list

- Each course shows its sections; each section lists its lessons.
- Under each section: **"Answers N discussion(s)"** with the matching discussion titles,
  reasons, and similarity %.
- **Add section / Add lesson** forms appear inline under each section.

### Candidate new lessons

Recurring discussion clusters that **no** section answers — each is a suggestion for a new
lesson you could add.

Flow: build/import a course → add sections/lessons → refresh matches → read which
discussions are already covered → promote clusters into new lessons.

---

## 10. Account

**Route:** `/dashboard/account`

Two cards:

- **Profile** — email, full name, username, and plan.
- **Session** — **Sign out** button.

---

## 11. Health

**Route:** `/health` (public, no login required)

A live status page for the system. Shows an overall **Healthy / Degraded / Unhealthy**
badge and per-service rows (Supabase, Gemini, Reddit, embeddings, etc.) with status,
latency, and details. The **Raw JSON** link exposes the same data as JSON.

Use this screen to confirm a deployed instance can reach its providers and to debug why
imports/scoring are failing.

---

## 12. End-to-end "first run" walkthrough

The fastest way to see value:

1. **Sign up** at `/sign-in` (Sign up tab).
2. On the **Dashboard**, add a Reddit source in the **Reddit Sources** card
   (e.g. `programming`).
3. Press **Import Reddit posts** → a toast reports imported counts.
4. Return to **Dashboard**: the overview cards now show active sources, top priority,
   trending topics, and opportunities. Click a topic to filter, or a title to drill in.
5. On the **Discussion detail** page, read the summary, score breakdown, recommended
   action, response outline, and content ideas.
6. Upload a document in **Knowledge base** and press **Refresh coverage** to see which
   discussions are already answered vs. gaps.
7. In **Courses**, import or create a course, then **Refresh matches** to see coverage and
   candidate new lessons.
8. Watch **Health** after each deploy to confirm everything is reachable.

---

## 13. Env vars that power these screens

| Variable                                                     | Used for                                 |
| ------------------------------------------------------------ | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + database + storage                |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`                  | Reddit import                            |
| `GEMINI_API_KEY`                                             | Enrichment, scoring, embeddings (Vercel) |
| `KB_EMBEDDING_PROVIDER`                                      | `gemini` on Vercel, `local` for dev      |
| `NEXT_PUBLIC_SITE_URL`                                       | Absolute URLs (health page)              |
| `RESEND_API_KEY` / email sender                              | Magic-link emails                        |

See `.env.example` for the full list.
