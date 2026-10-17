# CollabSphere: Cross-House & Regional Meetup Engine
Build-a-Thon 1.0, Theme 2. Next.js 15 (App Router) + TypeScript + libSQL (SQLite-compatible).

## Run locally
```bash
npm install && npm run dev   # http://localhost:3000
```
No database setup: it creates `data/collabsphere.db` with sample data. Dev admin passcode: `admin123`.

## Deploy on Netlify
1. Create a free hosted database at turso.tech, then copy its URL (`libsql://...`) and an auth token.
2. Push this folder to GitHub. In Netlify choose Add new site, Import from Git. Next.js is detected automatically.
3. Add environment variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ADMIN_PASSCODE`, `SESSION_SECRET` (a long random string; without it sign-in is disabled in production).
4. Deploy, open the site, sign in at `/login`. Tables and sample data are created on first request.

Netlify Functions cap request bodies at 6 MB, so proof photos are limited to 4 MB.

## Lifecycle
Propose (`/propose`) → each co-host house lead accepts (`/lead`) → admin approves (`/admin`) → check-in opens 1h before the start (admins can force it open or closed) → attendees scan the QR (verified instantly) or upload a photo (admin verifies) → points: 10 per attendee, +5 for cross-house events → house leaderboard.

## Roles and security
- **Admin**: approvals, proof review, check-in controls, QR codes, and the house-lead passcodes.
- **House lead**: signs in with their house passcode; answers co-host invitations for their own house only.
- Sessions are HMAC-signed httpOnly cookies; every admin/lead Server Action re-checks the session. Login is rate-limited (5 failures, 15-minute lockout). Proof photos are validated by file bytes, visible only to admins, and deleted if rejected.

## Judging criteria
- **Architecture**: Server Components, Server Actions, Route Handlers (`/api/events`, admin-only `/api/proof/[id]`); all SQL in `lib/store.ts`, auth in `lib/auth.ts`.
- **Relevance**: full propose → approve → check in → verify → recognise lifecycle with co-host consent and cross-house scoring.
- **UI/UX**: mobile-first, SVG map with no tile dependency, semantic HTML, keyboard-operable, 44px touch targets.
- **Admin**: stats, approval queue, co-host handling, photo review, check-in controls, QR codes.

## Not built yet
Client-side photo resizing, geofence check on check-in, notifications.
