# Audit — Zoric Commerce OS (Lovable export)

Date: 2026-11-11 · Stack: TanStack Start (React 19, Vite 8, SSR server functions) · Supabase (Postgres + Auth + RLS) · Tailwind v4 / shadcn.

## What the project is

| Area | Route | Data |
| --- | --- | --- |
| **Zoric Commerce OS** (the real product) | `/zoric/*` behind auth | Supabase, 18 `zoric_*` tables, server functions in `src/lib/zoric/data.functions.ts` |
| "Nexus Business" legacy dashboard | `/nexus`, `/products`, `/orders`, `/clients`, `/invoices`, … | Browser `localStorage` only (zustand) — no DB, no auth |

`/` now redirects to `/zoric`. The legacy pages are still reachable at their URLs.

## Findings & fixes

### Critical (fixed)
1. **Privilege escalation via RLS** — `zoric_members_insert` allowed `user_id = auth.uid()` on *any* store with *any* role. Any signed-in user who knew a store id could add themselves as `owner`. → Insert now requires owner/admin of that store; self-provisioning goes through the `SECURITY DEFINER` function `zoric_ensure_workspace()`.
2. **Shared, writable demo store** — every user was auto-joined as **owner** of one shared demo store (`zoric_ensure_demo_membership`) and `zoric_has_store_access` granted full read/write on it to everybody. → Removed. Each user gets a private store; optional demo data is seeded into *their own* store via `zoric_seed_demo_data()` ("Charger la démo" button on the empty dashboard).
3. **Global delivery partners were writable by anyone** (`store_id IS NULL` rows passed the policy) and `savePartner` could re-assign them to a store. → Global rows are read-only; each new store gets its own editable partners.

### High (fixed)
4. **Team invitations were broken** — `saveMember` inserted the *inviter's* `user_id` (unique violation on `(store_id,user_id)`), so no one could ever be invited. → `user_id` is nullable while pending; invitations are claimed automatically when the invited e-mail signs in.
5. **Login with Google only worked inside Lovable** (`@lovable.dev/cloud-auth-js`). → Replaced with native `supabase.auth.signInWithOAuth`, hidden behind `VITE_ENABLE_GOOGLE_AUTH` until you enable the provider.
6. **Sign-up assumed instant session** — with e-mail confirmation on (your project default) users were bounced back to login. → "Check your e-mail" state + password reset flow added.
7. **Open redirect** on `/auth?redirect=` → now restricted to same-origin paths.
8. **Build targeted Cloudflare** (Lovable default) → Nitro preset `vercel` (`.vercel/output`).
9. **`.env` was committed** (old project keys) → `.env` git-ignored, `.env.example` added. The `sb_secret_…` key is server-only and verified absent from the client bundle.

### Medium / notes (not changed)
- All store members can write everything regardless of role (viewer/support/…); roles are only enforced for store settings & team. Tighten per-table if you add staff.
- `fetchRemoteSheet` fetches any `https://` URL server-side (light SSRF surface). Consider restricting to `docs.google.com`.
- Several list endpoints cap at 500–1000 rows; add pagination when volumes grow.
- `recharts@2` is EOL; `xlsx@0.18` (npm) has known advisories — fine for local parsing of your own files, avoid parsing untrusted uploads.
- Legacy "Nexus" pages keep data only in the browser.

## Database

Old Lovable migrations were consolidated into a single idempotent-on-fresh-DB migration:
`supabase/migrations/20261111000000_zoric_init.sql` (schema, RLS, triggers, provisioning, demo seeder).

## Redesign

Ember/charcoal theme matching the reference video: new sidebar (sections, counters, daily-goal ring), top bar (Ctrl K command palette, date, theme toggle, notifications), Overview (gradient takings card, sparkline KPIs, wallet, monthly gauge, lollipop "takings vs target" chart), new **Ventes** page (Encaissements / Canaux / Meilleures ventes), Orders **dispatch board** (Kanban with one-click status advance), new auth page. All other pages were moved to theme tokens so they follow dark/light mode.
