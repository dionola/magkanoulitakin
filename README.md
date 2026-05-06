# Magkano Ulit Akin

Magkano Ulit Akin is for the moment after dinner, a trip, or a shared errand when everyone is trying to remember who paid, who joined, and how much each person still owes. It starts as a quick group-split calculator, then turns those one-off calculations into saved expenses, shared transactions, friend-based records, and dashboard views you can come back to later.

I built it as a portfolio piece that feels like a small real product: the calculator works without ceremony, signed-in users can track their own spending, friends can share transaction groups, and guests can view shared links without needing the full account flow.

## App Walkthrough

Add a short demo video here that walks through the main flow: creating a split in the calculator, signing in, saving expenses, sharing a transaction with friends, and checking the dashboard.

```markdown
[![Magkano Ulit Akin app walkthrough](./public/demo-thumbnail.png)](https://your-demo-video-link.com)
```

## Tech Runthrough

The app is built with the Next.js App Router, React, and TypeScript. Routes, pages, layouts, and API handlers live together in `app/`, with reusable UI, providers, and feature components split out under `components/`.

Authentication runs through NextAuth, using credentials login plus Google OAuth and the MongoDB adapter for persistence. App data is stored in MongoDB with Mongoose models, while request payloads are validated with Zod before they reach the database.

On the client side, TanStack Query handles cached dashboard and account data, with a small shared API wrapper keeping fetch behavior consistent. The interface uses Tailwind CSS, lucide-react icons, next-themes for theme handling, and Recharts for spending visualizations. Playwright covers the main end-to-end flows, including auth, friend requests, shared expenses, and synced transaction updates.

## Tech Stack

- **Framework:** Next.js App Router, React, TypeScript
- **Authentication:** NextAuth, credentials auth, Google OAuth
- **Database:** MongoDB, Mongoose, NextAuth MongoDB adapter
- **Data fetching:** TanStack Query, shared fetch wrapper
- **Validation:** Zod
- **Styling and UI:** Tailwind CSS, lucide-react, next-themes
- **Charts:** Recharts
- **Testing:** Playwright, ESLint, TypeScript
- **Analytics:** Vercel Analytics

## Features

- Expense calculator with people, categories, split participants, and settlement summaries
- Email/password and Google sign-in through NextAuth
- Personal dashboard with date filters, spending charts, category breakdowns, and history
- Friend requests, friend lists, and shared transaction creation
- Shareable links for guest access to transaction groups
- Account settings for profile name, password changes, and account deletion
- Seed script and Playwright coverage for core app flows

## Project Structure

```text
app/                  Next.js routes, pages, layouts, and API handlers
components/           Feature, layout, provider, and small UI components
hooks/                Client-side app hooks and query-backed data access
lib/api.ts            Shared client API wrapper
lib/auth.ts           NextAuth configuration
lib/db.ts             Mongoose connection helper
lib/mongodb.ts        MongoDB client for the NextAuth adapter
lib/models/           Mongoose schemas
lib/validations/      Zod request schemas
lib/utils/            Calculator, dashboard, settlement, and formatting helpers
scripts/seed.mjs      Local seed data script
tests/e2e/            Playwright end-to-end tests
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

If `.env.example` is not present, create `.env.local` with the variables below.

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The home route redirects to the calculator.

## Scripts

```bash
pnpm dev       # Start the local dev server
pnpm build     # Create a production build
pnpm start     # Run the production build
pnpm lint      # Run ESLint
pnpm seed      # Seed local MongoDB data from .env.local
pnpm test:e2e  # Run Playwright tests
```

The seed script creates sample users, friendships, and expenses for local testing.

## Quality Checks

Before publishing or deploying, run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

For end-to-end coverage:

```bash
pnpm test:e2e
```

## Notes

- This repository intentionally keeps generated output, local env files, Playwright artifacts, and build caches out of source control.
- The app uses the NextAuth MongoDB adapter for auth persistence and Mongoose models for domain data.
- `MONGODB_URI` and OAuth credentials must be configured in the hosting environment before deploying.
