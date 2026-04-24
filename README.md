# Magkano Ulit Akin

Next.js expense-sharing app for tracking personal expenses, shared expenses, and friend-based splits.

## Stack

- Next.js
- React
- NextAuth
- MongoDB / Mongoose
- Playwright
- Tailwind CSS

## Features

- email + Google auth
- expense calculator
- shared transactions
- friend requests and friend lists
- dashboard charts
- shareable links for transactions

## Run

```bash
pnpm install
pnpm dev
```

## Environment

This project expects a local env file such as `.env.local`.

Typical values include:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Useful Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test:e2e`
- `pnpm seed`

## Notes

- App routes live under [`app`](./app).
- Shared API helpers live in [`lib/api.ts`](./lib/api.ts).
- End-to-end tests live in [`tests/e2e`](./tests/e2e).
