# Sift

Sift is a Next.js 15 (App Router) web application that turns raw Reddit discussions into structured, scored knowledge — mapped to courses and learning paths.

The system is built as a **provider-abstraction architecture**: content **sources** (currently Reddit) and **AI providers** (currently Google Gemini) are interchangeable behind stable interfaces. Swapping a provider should not require changing feature code.

## Tech Stack

- **Next.js 15** — App Router, React Server Components, Turbopack
- **TypeScript** — strict mode
- **Tailwind CSS v4** — CSS-first configuration
- **shadcn/ui** — neutral base theme (`base-nova` style, Base UI, Lucide icons)
- **ESLint** (flat config, `eslint-config-next`) + **Prettier** (`prettier-plugin-tailwindcss`)
- **Zod** — runtime schema validation
- **React Hook Form** + `@hookform/resolvers` — forms
- **TanStack Query** — server-state management (client components)
- **TanStack Table** — data tables (e.g. curated threads, course maps)
- **Framer Motion** — animation

## Folder Structure

Feature-first organization. Each feature owns its domain — components, hooks, schemas, and server actions are colocated with it.

```
src/
├── app/                    # Next.js App Router routes
│   └── (routes)/           # route groups mapped to features
├── features/               # feature slices (domain-owned code)
│   ├── reddit/             # Reddit source: ingestion, normalization
│   ├── ai/                 # AI provider layer + scoring prompts
│   ├── knowledge-base/     # curated threads, entities, notes
│   ├── scoring/            # scoring engine + signals
│   ├── course-mapper/      # course/learning-path mapping
│   └── dashboard/          # dashboard UI
├── components/             # shared UI primitives (shadcn/ui)
│   └── ui/
├── lib/                    # framework glue, utilities, providers
├── server/                 # server-only code (db, auth, env)
└── types/                  # shared TypeScript types
```

## Provider Abstraction

Sift never talks to an external service directly from a feature. Every integration lives behind an interface defined in the codebase, and features depend on the interface, not the implementation.

### Sources (content providers)

Implement the `SourceAdapter` contract (discover content, normalize it into the internal domain model, enrich with metadata). Currently implemented: `RedditSource`. Sources are registered in a registry so the rest of the app is source-agnostic.

### AI Providers

Implement the `AIProvider` interface (e.g. summarize, extract entities, score). Currently implemented: `GeminiProvider`. Additional providers (OpenAI, Anthropic, local models) can be added by implementing the same interface and registering them.

### Why

- **Pluggable**: swap Reddit for another source, or Gemini for another model, without touching feature code.
- **Testable**: mock the interface, not the network.
- **Resilient**: add fallback providers, rate limiting, and caching at the boundary.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your provider credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example`. All variables are provider credentials — the app does not start a background sync or connect to any external service until those features are built.

## Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start dev server (Turbopack)   |
| `npm run build`    | Production build               |
| `npm run start`    | Serve production build         |
| `npm run lint`     | ESLint                         |
| `npm run format`   | Prettier write                 |
| `npm run format:check` | Prettier check             |
