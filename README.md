# Magkano Ulit Akin (How much was mine again?)

[![magkanoulitakin](https://ejyic7eskr7jje45.public.blob.vercel-storage.com/magkanoulitakin-thumbnail.png)](https://magkanoulitakin.com)
  
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![NextAuth.js](https://img.shields.io/badge/NextAuth.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat&logo=zod&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat&logo=recharts&logoColor=white)

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
