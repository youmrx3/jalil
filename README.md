# Zoric — Commerce OS

COD e-commerce back-office: orders & dispatch board, products, stock, customers, deliveries, returns, ads (ROAS), finances, reports, team.

Stack: TanStack Start (React 19 + SSR server functions) · Supabase · Tailwind v4 · shadcn/ui · Recharts. See [AUDIT.md](AUDIT.md) for the security review.

## 1. Database (Supabase)

1. Supabase Dashboard → **SQL Editor** → paste and run `supabase/migrations/20261111000000_zoric_init.sql` (once, on an empty project).
   Or with the CLI: `supabase link --project-ref cjrxwuebebysgjaojapy && supabase db push`.
2. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL (e.g. `https://jalil.vercel.app`) and add `https://*.vercel.app/**` and `http://localhost:5173/**` to *Redirect URLs*.
3. (Optional) **Authentication → Providers → Google**: enable it, then set `VITE_ENABLE_GOOGLE_AUTH=true`.

Each new account gets its own private store automatically. On the empty dashboard, **Charger la démo** fills it with sample data (removable in Paramètres → Zone de danger).

## 2. Local development

```sh
cp .env.example .env   # fill in your keys
npm install
npm run dev            # http://localhost:5173
```

## 3. Deploy on Vercel

1. Import the GitHub repo in Vercel (framework preset: **Other** — the build writes `.vercel/output` itself).
2. Build command `npm run build` (default) · Install command `npm install`.
3. Environment variables (Production + Preview):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (server only — never prefix with `VITE_`) |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same as `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_ENABLE_GOOGLE_AUTH` | `false` (or `true` once Google is enabled) |

`VITE_*` values are baked in at build time — redeploy after changing them.
