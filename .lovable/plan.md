## Zoric Commerce OS — Build Plan

Mounts under `/zoric/*` with its own dark-navy sidebar and French UI. Existing pages (Dashboard, E-com, B2B, Branding, Calculators, etc.) stay untouched at their current routes.

### Phase 1 — Foundation (this turn)

**Supabase schema + seed (single migration, needs your approval):**
17 tables: `zoric_stores`, `zoric_store_members`, `zoric_products`, `zoric_product_variants`, `zoric_inventory`, `zoric_stock_movements`, `zoric_customers`, `zoric_orders`, `zoric_order_items`, `zoric_delivery_partners`, `zoric_deliveries`, `zoric_returns`, `zoric_ad_platforms`, `zoric_ad_campaigns`, `zoric_ad_metrics`, `zoric_expenses`, `zoric_notifications`.

- `zoric_` prefix so it never collides with your existing tables.
- Every table has `store_id`; RLS via `has_store_access(store_id)` security-definer function reading `zoric_store_members`. No recursion.
- GRANTs to `authenticated` + `service_role` on every table.
- Seed: 1 demo store "Souk DZ Store", ~15 products (fitness belt, watch, etc.), 3 delivery partners (Yalidine, ZR Express, Maystro), 6 campaigns across Meta/TikTok, 60 orders across all statuses spanning 30 days, ~40 customers with wilaya distribution, returns, ad metrics, notifications. Store owner auto-linked on first login via trigger.

**App shell:**
- Route `src/routes/zoric/route.tsx` — dark navy sidebar (`#101828`), top header with breadcrumbs/search/date-range/store selector/notifications/user menu. Uses `AppSidebar`-style structure but Zoric-specific.
- Route `src/routes/zoric/index.tsx` — Dashboard.
- New design tokens in `src/styles.css` under a `.zoric-scope` class so Zoric colors (`#F7F8FA` bg, `#2563EB` primary, `#101828` sidebar, Inter font) don't affect existing pages.
- `src/lib/zoric/` folder for server fns, types, and query hooks.

### Phase 2 — Core operational pages (next turn)

Dashboard, Commandes (with detail drawer), Produits, Stocks, Clients, Publicités. All wired to Supabase via `createServerFn` + TanStack Query. Tables get sort/filter/pagination/skeleton/empty states. Order drawer with timeline + actions.

### Phase 3 — Remaining pages + polish (turn after)

Livraisons, Retours, Finances, Rapports, Équipe, Paramètres. Onboarding modal, notifications panel, CSV export, light/dark toggle scoped to Zoric.

### Auth

Reuses your existing Lovable Cloud auth. `/zoric/*` sits under `_authenticated/` (or a new `_authenticated/zoric/` subtree) so unauthenticated users are redirected to `/auth`. First login auto-creates a `zoric_store_members` row against the seeded demo store so the user sees data immediately. No new auth screens — your project already has them.

### Out of scope

- Real Meta/TikTok/Yalidine API integrations (UI cards only, no OAuth).
- Multi-store creation UI beyond the seeded store (Phase 3 settings tab stubs it).
- Real-time subscriptions (polling via TanStack Query).
- French → Arabic/English i18n wiring (labels are French strings, structure ready but no i18n lib).

### Technical notes

- All queries via `createServerFn` with `requireSupabaseAuth` — no direct client Supabase calls for data.
- Recharts for all charts (already installed).
- shadcn components already in project — no new UI lib.
- Zoric routes never import from existing store/routes and vice versa.

Confirm and I'll start with Phase 1 (migration + shell) this turn.
