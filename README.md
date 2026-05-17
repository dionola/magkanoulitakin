# Magkano Ulit Akin

## Project Structure

```
app/
  api/                          API route handlers
    auth/signup/
    expenses/[id]/
    friends/[id]/
    friends/requests/
    ocr/
    shareable-links/[linkId]/
    shareable-links/[linkId]/transaction/
    transaction-groups/[id]/
    users/delete/
    users/me/
    users/password/
  auth/signin/                  Sign-in page
  auth/signup/                  Sign-up page
  calculator/                   Expense calculator page
  dashboard/                    Dashboard pages (overview, history, budgets)
  share/[linkId]/               Guest shareable link page
  globals.css
  layout.tsx
  page.tsx

components/
  calculator/                   Calculator UI components
  dashboard/                    Dashboard UI components
  layout/                       Header and layout components
  providers/                    React context providers
  ui/                           Small shared UI components

hooks/                          Client-side hooks (data fetching, local state)

lib/
  models/                       Mongoose schemas (User, Expense, Friend, ShareableLink)
  utils/                        Calculator, dashboard, settlement, and formatting helpers
  validations/                  Zod request schemas
  api.ts                        Shared client fetch wrapper
  auth.ts                       NextAuth configuration
  db.ts                         Mongoose connection helper
  mongodb.ts                    MongoDB client for NextAuth adapter

scripts/
  seed.mjs                      Seed script for local dev data

tests/
  e2e/                          Playwright end-to-end tests

public/                         Static assets
```

## Environment Variables

Create `.env.local` in the project root:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
```

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).
