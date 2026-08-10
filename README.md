# poidh roll

Proof-first Expo app for the [POIDH Bounty Showcase](https://poidh.xyz/base/bounty/1306) challenge.

Browse live bounties through their claim photos — like a film roll of “pics or it didn’t happen.”

## What it does

- Loads real bounty data from `https://poidh.xyz/bounties/data`
- Hydrates each card with claim proof images from `https://poidh.xyz/[chain]/bounty/[id]/data`
- Filters by chain (Base / Arbitrum / Ethereum / Degen)
- Sorts by value, newest, or most claims
- Highlights open lanes with no claims yet
- Links out to poidh.xyz for funding, claiming, and voting (no wallet required in-app)

## Run locally

```bash
npm install
npm run web      # browser
npm run ios      # Expo Go / simulator
npm run android
```

## Public deploy (required for the bounty)

Ship the web build anywhere static hosting works:

```bash
npx expo export --platform web
```

Then host the `dist/` folder on Vercel, Cloudflare Pages, Netlify, GitHub Pages, etc.

## Bounty submission checklist

1. Deploy the web app publicly
2. Cast the live link on Farcaster
3. Submit a claim on [bounty #1306](https://poidh.xyz/base/bounty/1306) with:
   - live app URL
   - Farcaster cast URL
   - a screenshot of the app

## Stack

Expo + React Native (web/iOS/Android) · Syne + DM Sans · expo-image · POIDH public JSON APIs only

## Auth (Privy)

This web deploy uses **`@privy-io/react-auth`** (Privy’s React/web SDK). Do **not** switch to `@privy-io/expo` for Vercel — that SDK is iOS/Android only (“Web is not supported”).

1. Copy `.env.example` to `.env` / `.env.local` and set `EXPO_PUBLIC_PRIVY_APP_ID` from the [Privy Dashboard](https://dashboard.privy.io).
2. Enable **Email** and **SMS** login methods in the dashboard.
3. Add your deploy origin (and `http://localhost:8081`) under allowed domains / app clients.
4. Restart Expo after changing env vars (`npm run web`).

Metro resolves Privy’s optional Solana peer packages at build time, so `@solana/kit` and `@solana-program/*` are installed even though this app is Ethereum-only. `metro.config.js` follows Privy’s package-exports guidance for `jose` / `zustand` / `isows`.

## Routing

- Feed: `/`
- Bounty: `/bounty/:chain/:id` (e.g. `/bounty/base/1306`)
- Browser back/forward and direct links are supported on web. For static hosts, rewrite all paths to `index.html` (see `vercel.json`).
