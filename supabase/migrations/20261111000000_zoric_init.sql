
-- ============================================================
-- ZORIC COMMERCE OS — consolidated schema (fresh Supabase project)
-- Run once in Supabase Dashboard > SQL Editor, or via `supabase db push`.
-- Prefix: zoric_  (isolated from existing tables)
-- ============================================================

-- Shared updated_at trigger fn (reuse-safe)
CREATE OR REPLACE FUNCTION public.zoric_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Role enum
DO $$ BEGIN
  CREATE TYPE public.zoric_role AS ENUM ('owner','admin','manager','media_buyer','support','delivery','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. STORES
-- ============================================================
CREATE TABLE public.zoric_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'DZD',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_stores TO authenticated;
GRANT ALL ON public.zoric_stores TO service_role;
ALTER TABLE public.zoric_stores ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_stores_touch BEFORE UPDATE ON public.zoric_stores
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();

-- ============================================================
-- 2. STORE MEMBERS
-- ============================================================
CREATE TABLE public.zoric_store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL while invitation is pending
  role public.zoric_role NOT NULL DEFAULT 'viewer',
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_store_members TO authenticated;
GRANT ALL ON public.zoric_store_members TO service_role;
ALTER TABLE public.zoric_store_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_members_touch BEFORE UPDATE ON public.zoric_store_members
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();

-- Access helper (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.zoric_has_store_access(_store_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zoric_store_members
    WHERE store_id = _store_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.zoric_has_store_role(_store_id UUID, _roles public.zoric_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zoric_store_members
    WHERE store_id = _store_id AND user_id = auth.uid()
      AND status = 'active' AND role = ANY(_roles)
  );
$$;

-- Store policies
CREATE POLICY zoric_stores_select ON public.zoric_stores FOR SELECT TO authenticated
  USING (public.zoric_has_store_access(id));
CREATE POLICY zoric_stores_insert ON public.zoric_stores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY zoric_stores_update ON public.zoric_stores FOR UPDATE TO authenticated
  USING (public.zoric_has_store_role(id, ARRAY['owner','admin']::public.zoric_role[]))
  WITH CHECK (public.zoric_has_store_role(id, ARRAY['owner','admin']::public.zoric_role[]));
CREATE POLICY zoric_stores_delete ON public.zoric_stores FOR DELETE TO authenticated
  USING (public.zoric_has_store_role(id, ARRAY['owner']::public.zoric_role[]));

-- Members policies
CREATE POLICY zoric_members_select ON public.zoric_store_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.zoric_has_store_access(store_id));
CREATE POLICY zoric_members_insert ON public.zoric_store_members FOR INSERT TO authenticated
  WITH CHECK (public.zoric_has_store_role(store_id, ARRAY['owner','admin']::public.zoric_role[]));
CREATE POLICY zoric_members_update ON public.zoric_store_members FOR UPDATE TO authenticated
  USING (public.zoric_has_store_role(store_id, ARRAY['owner','admin']::public.zoric_role[]));
CREATE POLICY zoric_members_delete ON public.zoric_store_members FOR DELETE TO authenticated
  USING (public.zoric_has_store_role(store_id, ARRAY['owner','admin']::public.zoric_role[]));

-- Generic store-scoped policy generator via macro-like blocks below.

-- ============================================================
-- 3. PRODUCTS + VARIANTS + INVENTORY + MOVEMENTS
-- ============================================================
CREATE TABLE public.zoric_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  image_url TEXT,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  packaging_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_products TO authenticated;
GRANT ALL ON public.zoric_products TO service_role;
ALTER TABLE public.zoric_products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_products_touch BEFORE UPDATE ON public.zoric_products
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_products_all ON public.zoric_products FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id))
  WITH CHECK (public.zoric_has_store_access(store_id));

CREATE TABLE public.zoric_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.zoric_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_override NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_product_variants TO authenticated;
GRANT ALL ON public.zoric_product_variants TO service_role;
ALTER TABLE public.zoric_product_variants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_variants_touch BEFORE UPDATE ON public.zoric_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_variants_all ON public.zoric_product_variants FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

CREATE TABLE public.zoric_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.zoric_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.zoric_product_variants(id) ON DELETE CASCADE,
  warehouse TEXT NOT NULL DEFAULT 'Principal',
  available INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  incoming INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_inventory TO authenticated;
GRANT ALL ON public.zoric_inventory TO service_role;
ALTER TABLE public.zoric_inventory ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_inventory_touch BEFORE UPDATE ON public.zoric_inventory
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_inventory_all ON public.zoric_inventory FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

CREATE TABLE public.zoric_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.zoric_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.zoric_product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  reason TEXT NOT NULL, -- sale, return, adjustment, import
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_stock_movements TO authenticated;
GRANT ALL ON public.zoric_stock_movements TO service_role;
ALTER TABLE public.zoric_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_movements_all ON public.zoric_stock_movements FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE public.zoric_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  wilaya TEXT,
  city TEXT,
  address TEXT,
  tags TEXT[] DEFAULT '{}',
  risk_level TEXT DEFAULT 'low',
  total_orders INT NOT NULL DEFAULT 0,
  delivered_orders INT NOT NULL DEFAULT 0,
  cancelled_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_customers TO authenticated;
GRANT ALL ON public.zoric_customers TO service_role;
ALTER TABLE public.zoric_customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_customers_touch BEFORE UPDATE ON public.zoric_customers
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_customers_all ON public.zoric_customers FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 5. DELIVERY PARTNERS
-- ============================================================
CREATE TABLE public.zoric_delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  api_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_delivery_partners TO authenticated;
GRANT ALL ON public.zoric_delivery_partners TO service_role;
ALTER TABLE public.zoric_delivery_partners ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_partners_touch BEFORE UPDATE ON public.zoric_delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
-- Global partners (store_id NULL) are read-only; store partners are editable by members.
CREATE POLICY zoric_partners_select ON public.zoric_delivery_partners FOR SELECT TO authenticated
  USING (store_id IS NULL OR public.zoric_has_store_access(store_id));
CREATE POLICY zoric_partners_insert ON public.zoric_delivery_partners FOR INSERT TO authenticated
  WITH CHECK (store_id IS NOT NULL AND public.zoric_has_store_access(store_id));
CREATE POLICY zoric_partners_update ON public.zoric_delivery_partners FOR UPDATE TO authenticated
  USING (store_id IS NOT NULL AND public.zoric_has_store_access(store_id))
  WITH CHECK (store_id IS NOT NULL AND public.zoric_has_store_access(store_id));
CREATE POLICY zoric_partners_delete ON public.zoric_delivery_partners FOR DELETE TO authenticated
  USING (store_id IS NOT NULL AND public.zoric_has_store_access(store_id));

-- ============================================================
-- 6. ORDERS + ITEMS
-- ============================================================
CREATE TABLE public.zoric_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL,
  customer_id UUID REFERENCES public.zoric_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  wilaya TEXT,
  city TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  -- new | to_confirm | confirmed | prepared | shipped | in_delivery | delivered | cancelled | returned
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_partner_id UUID REFERENCES public.zoric_delivery_partners(id),
  source TEXT, -- meta / tiktok / organic / manual
  campaign_id UUID,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  confirmation_note TEXT,
  internal_note TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX zoric_orders_store_date ON public.zoric_orders(store_id, order_date DESC);
CREATE INDEX zoric_orders_status ON public.zoric_orders(store_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_orders TO authenticated;
GRANT ALL ON public.zoric_orders TO service_role;
ALTER TABLE public.zoric_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_orders_touch BEFORE UPDATE ON public.zoric_orders
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_orders_all ON public.zoric_orders FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

CREATE TABLE public.zoric_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.zoric_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.zoric_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.zoric_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_order_items TO authenticated;
GRANT ALL ON public.zoric_order_items TO service_role;
ALTER TABLE public.zoric_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_order_items_all ON public.zoric_order_items FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 7. DELIVERIES
-- ============================================================
CREATE TABLE public.zoric_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.zoric_orders(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.zoric_delivery_partners(id),
  tracking_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  -- created | picked_up | in_transit | out_for_delivery | delivered | failed | returned
  courier_name TEXT,
  cod_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cod_collected BOOLEAN NOT NULL DEFAULT false,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_deliveries TO authenticated;
GRANT ALL ON public.zoric_deliveries TO service_role;
ALTER TABLE public.zoric_deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_deliveries_touch BEFORE UPDATE ON public.zoric_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_deliveries_all ON public.zoric_deliveries FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 8. RETURNS
-- ============================================================
CREATE TABLE public.zoric_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.zoric_orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  stock_action TEXT NOT NULL DEFAULT 'restock', -- restock | discard | resend
  financial_impact NUMERIC(12,2) NOT NULL DEFAULT 0,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_returns TO authenticated;
GRANT ALL ON public.zoric_returns TO service_role;
ALTER TABLE public.zoric_returns ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_returns_touch BEFORE UPDATE ON public.zoric_returns
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_returns_all ON public.zoric_returns FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 9. AD PLATFORMS + CAMPAIGNS + METRICS
-- ============================================================
CREATE TABLE public.zoric_ad_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zoric_ad_platforms TO authenticated;
GRANT ALL ON public.zoric_ad_platforms TO service_role;
ALTER TABLE public.zoric_ad_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_platforms_select ON public.zoric_ad_platforms FOR SELECT TO authenticated USING (true);

CREATE TABLE public.zoric_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.zoric_ad_platforms(id),
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | archived
  daily_budget NUMERIC(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_ad_campaigns TO authenticated;
GRANT ALL ON public.zoric_ad_campaigns TO service_role;
ALTER TABLE public.zoric_ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_campaigns_touch BEFORE UPDATE ON public.zoric_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_campaigns_all ON public.zoric_ad_campaigns FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

CREATE TABLE public.zoric_ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.zoric_ad_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  purchases INT NOT NULL DEFAULT 0,
  confirmed_orders INT NOT NULL DEFAULT 0,
  attributed_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, metric_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_ad_metrics TO authenticated;
GRANT ALL ON public.zoric_ad_metrics TO service_role;
ALTER TABLE public.zoric_ad_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_metrics_all ON public.zoric_ad_metrics FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 10. EXPENSES
-- ============================================================
CREATE TABLE public.zoric_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_expenses TO authenticated;
GRANT ALL ON public.zoric_expenses TO service_role;
ALTER TABLE public.zoric_expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER zoric_expenses_touch BEFORE UPDATE ON public.zoric_expenses
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();
CREATE POLICY zoric_expenses_all ON public.zoric_expenses FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.zoric_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- info | success | warning | error
  read_at TIMESTAMPTZ,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_notifications TO authenticated;
GRANT ALL ON public.zoric_notifications TO service_role;
ALTER TABLE public.zoric_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_notifs_all ON public.zoric_notifications FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));

-- ============================================================

-- ============================================================
-- 12. STORE SETTINGS, BUSINESS PROFILES, SHIPPING RATES
-- ============================================================
ALTER TABLE public.zoric_stores
  ADD COLUMN IF NOT EXISTS currency_symbol text NOT NULL DEFAULT 'DZD',
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_delivery_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS order_code_prefix text NOT NULL DEFAULT 'CMD',
  ADD COLUMN IF NOT EXISTS invoice_footer text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';

CREATE TABLE IF NOT EXISTS public.zoric_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  rc text,
  nif text,
  ai text,
  nis text,
  address text,
  phone text,
  email text,
  bank_details text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_business_profiles TO authenticated;
GRANT ALL ON public.zoric_business_profiles TO service_role;
ALTER TABLE public.zoric_business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_business_profiles_all ON public.zoric_business_profiles FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));
CREATE TRIGGER zoric_business_profiles_touch BEFORE UPDATE ON public.zoric_business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.zoric_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.zoric_stores(id) ON DELETE CASCADE,
  wilaya_code text NOT NULL,
  wilaya_name text NOT NULL,
  home_price numeric NOT NULL DEFAULT 0,
  stopdesk_price numeric NOT NULL DEFAULT 0,
  return_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, wilaya_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoric_shipping_rates TO authenticated;
GRANT ALL ON public.zoric_shipping_rates TO service_role;
ALTER TABLE public.zoric_shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoric_shipping_rates_all ON public.zoric_shipping_rates FOR ALL TO authenticated
  USING (public.zoric_has_store_access(store_id)) WITH CHECK (public.zoric_has_store_access(store_id));
CREATE TRIGGER zoric_shipping_rates_touch BEFORE UPDATE ON public.zoric_shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.zoric_touch_updated_at();

ALTER TABLE public.zoric_orders
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS return_cost numeric NOT NULL DEFAULT 0;

ALTER TABLE public.zoric_ad_campaigns
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.zoric_products(id) ON DELETE SET NULL;

-- ============================================================
-- 13. REFERENCE DATA
-- ============================================================
INSERT INTO public.zoric_ad_platforms (code, name) VALUES
 ('meta',     'Meta (Facebook / Instagram)'),
 ('tiktok',   'TikTok Ads'),
 ('snapchat', 'Snapchat Ads'),
 ('google',   'Google Ads')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 14. WORKSPACE PROVISIONING (one store per user + invitations)
-- ============================================================
CREATE OR REPLACE FUNCTION public.zoric_ensure_workspace()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  sid uuid;
  base_slug text;
  new_slug text;
  n int := 0;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;

  -- Claim pending invitations sent to this e-mail address.
  IF uemail <> '' THEN
    UPDATE public.zoric_store_members m
       SET user_id = uid, status = 'active', updated_at = now()
     WHERE m.user_id IS NULL AND lower(m.invited_email) = uemail
       AND NOT EXISTS (SELECT 1 FROM public.zoric_store_members x WHERE x.store_id = m.store_id AND x.user_id = uid);
  END IF;

  SELECT s.id INTO sid
  FROM public.zoric_stores s
  JOIN public.zoric_store_members m ON m.store_id = s.id
  WHERE m.user_id = uid AND m.status = 'active'
  ORDER BY (m.role = 'owner') DESC, s.created_at ASC
  LIMIT 1;
  IF sid IS NOT NULL THEN RETURN sid; END IF;

  base_slug := 'boutique-' || substr(replace(uid::text, '-', ''), 1, 8);
  new_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.zoric_stores WHERE slug = new_slug) LOOP
    n := n + 1;
    new_slug := base_slug || '-' || n;
  END LOOP;

  INSERT INTO public.zoric_stores (name, slug, currency, timezone, is_demo)
  VALUES ('Ma boutique', new_slug, 'DZD', 'Africa/Algiers', false)
  RETURNING id INTO sid;

  INSERT INTO public.zoric_store_members (store_id, user_id, role, status, invited_email)
  VALUES (sid, uid, 'owner', 'active', nullif(uemail, ''));

  INSERT INTO public.zoric_delivery_partners (store_id, name, code, is_active, api_configured) VALUES
    (sid, 'Yalidine', 'yalidine', true, false),
    (sid, 'ZR Express', 'zr', true, false),
    (sid, 'Maystro Delivery', 'maystro', true, false),
    (sid, 'Coursier local', 'local', true, false);

  RETURN sid;
END $$;

-- Stock movements keep inventory in sync
CREATE OR REPLACE FUNCTION public.zoric_apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.zoric_inventory
  SET available = GREATEST(0, available + NEW.quantity), updated_at = now()
  WHERE store_id = NEW.store_id AND product_id = NEW.product_id
    AND (variant_id IS NOT DISTINCT FROM NEW.variant_id);
  IF NOT FOUND THEN
    INSERT INTO public.zoric_inventory (store_id, product_id, variant_id, warehouse, available)
    VALUES (NEW.store_id, NEW.product_id, NEW.variant_id, 'Principal', GREATEST(0, NEW.quantity));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zoric_stock_movement_apply AFTER INSERT ON public.zoric_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.zoric_apply_stock_movement();

-- Customer counters follow their orders
CREATE OR REPLACE FUNCTION public.zoric_sync_customer_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cids uuid[] := ARRAY[]::uuid[];
  cid uuid;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.customer_id IS NOT NULL THEN cids := array_append(cids, OLD.customer_id); END IF;
  IF TG_OP <> 'DELETE' AND NEW.customer_id IS NOT NULL THEN cids := array_append(cids, NEW.customer_id); END IF;
  FOREACH cid IN ARRAY cids LOOP
    UPDATE public.zoric_customers c
    SET total_orders = s.total_orders, delivered_orders = s.delivered_orders,
        cancelled_orders = s.cancelled_orders, total_spent = s.total_spent, updated_at = now()
    FROM (
      SELECT count(*)::int AS total_orders,
             count(*) FILTER (WHERE status = 'delivered')::int AS delivered_orders,
             count(*) FILTER (WHERE status IN ('cancelled','returned'))::int AS cancelled_orders,
             COALESCE(sum(total) FILTER (WHERE status = 'delivered'), 0) AS total_spent
      FROM public.zoric_orders WHERE customer_id = cid
    ) s
    WHERE c.id = cid;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zoric_orders_sync_customer AFTER INSERT OR UPDATE OR DELETE ON public.zoric_orders
  FOR EACH ROW EXECUTE FUNCTION public.zoric_sync_customer_stats();

-- ============================================================
-- 15. OPTIONAL DEMO DATA (button "Charger des données de démo")
-- Seeds the caller's own workspace only if it has no orders yet.
-- ============================================================
CREATE OR REPLACE FUNCTION public.zoric_seed_demo_data()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sid uuid := public.zoric_ensure_workspace();
  wilayas TEXT[] := ARRAY['Alger','Oran','Constantine','Sétif','Annaba','Blida','Tizi Ouzou','Batna','Béjaïa','Tlemcen','Ouargla','Djelfa'];
  statuses TEXT[] := ARRAY['new','to_confirm','confirmed','prepared','shipped','in_delivery','delivered','delivered','delivered','cancelled','returned'];
  sources TEXT[] := ARRAY['meta','tiktok','organic','meta','meta','tiktok','manual'];
  firsts TEXT[] := ARRAY['Amine','Sarah','Yacine','Lina','Rania','Karim','Meriem','Nadir','Sofia','Hocine','Imane','Walid','Nour','Rayan','Ines','Adel'];
  lasts TEXT[] := ARRAY['Belkacem','Khaldi','Mansouri','Bouzid','Kaddour','Haddad','Zerrouki','Slimani','Berrahal','Djellouli','Saadi','Brahimi'];
  cust_ids uuid[]; prod_ids uuid[]; camp_ids uuid[]; partner_ids uuid[]; plat_ids uuid[];
  i int; oid uuid; pid uuid; cust uuid; qty int; price numeric; cost numeric; st text; odate date;
  cname text; cphone text; cwil text;
BEGIN
  IF sid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.zoric_has_store_role(sid, ARRAY['owner','admin']::public.zoric_role[]) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF EXISTS (SELECT 1 FROM public.zoric_orders WHERE store_id = sid) THEN RETURN 0; END IF;

  INSERT INTO public.zoric_products (store_id, name, sku, category, description, selling_price, product_cost, packaging_cost, supplier) VALUES
   (sid,'Ceinture Fitness Sudation','FIT-BELT-01','Sport','Ceinture minceur néoprène',2900,900,150,'Aliexpress'),
   (sid,'Montre Connectée Smart X8','WATCH-X8','Électronique','Montre connectée sport & santé',6900,2400,250,'Grossiste Alger'),
   (sid,'Écouteurs Sans Fil ProBuds','AUDIO-PB','Audio','Écouteurs Bluetooth 5.3',5400,1900,180,'Grossiste Alger'),
   (sid,'Épilateur Laser IPL','BEAUTY-IPL','Beauté','Épilateur à lumière pulsée',8900,3200,300,'Import Chine'),
   (sid,'Mini Projecteur Portable','ELEC-PROJ','Électronique','Projecteur LED HD 720p',9500,3800,350,'Grossiste Oran'),
   (sid,'Sac à Dos Antivol USB','BAG-USB','Accessoires','Sac urbain avec port USB',4200,1300,200,'Fournisseur local'),
   (sid,'Lampe LED Sunset','HOME-LED','Maison','Lampe d''ambiance coucher de soleil',3500,1000,150,'Import Chine'),
   (sid,'Kit Manucure Électrique','BEAUTY-NAIL','Beauté','Ponceuse à ongles rechargeable',3900,1300,180,'Grossiste Alger');
  SELECT array_agg(id) INTO prod_ids FROM public.zoric_products WHERE store_id = sid;

  INSERT INTO public.zoric_inventory (store_id, product_id, warehouse, available, reserved, incoming, reorder_level)
  SELECT sid, id, 'Principal', 20 + (random()*80)::int, (random()*8)::int, 0, 10 FROM unnest(prod_ids) id;
  UPDATE public.zoric_inventory SET available = 3 WHERE store_id = sid AND product_id = prod_ids[4];
  UPDATE public.zoric_inventory SET available = 0 WHERE store_id = sid AND product_id = prod_ids[5];

  FOR i IN 1..24 LOOP
    INSERT INTO public.zoric_customers (store_id, full_name, phone, wilaya, city, address)
    VALUES (sid, firsts[1 + (random()*(array_length(firsts,1)-1))::int] || ' ' || lasts[1 + (random()*(array_length(lasts,1)-1))::int],
            '+2135' || lpad((10000000 + (random()*89999999)::int)::text, 8, '0'),
            wilayas[1 + ((i-1) % array_length(wilayas,1))], wilayas[1 + ((i-1) % array_length(wilayas,1))], 'Adresse ' || i);
  END LOOP;
  SELECT array_agg(id) INTO cust_ids FROM public.zoric_customers WHERE store_id = sid;

  SELECT array_agg(id ORDER BY code) INTO plat_ids FROM public.zoric_ad_platforms WHERE code IN ('meta','tiktok');
  INSERT INTO public.zoric_ad_campaigns (store_id, platform_id, name, objective, status, daily_budget, start_date) VALUES
   (sid, plat_ids[1], 'CBO - Ceinture Fitness', 'conversions', 'active', 3500, CURRENT_DATE - 25),
   (sid, plat_ids[1], 'Retargeting - 7 jours', 'retargeting', 'active', 1500, CURRENT_DATE - 20),
   (sid, plat_ids[2], 'TikTok Spark - Projecteur', 'conversions', 'active', 3000, CURRENT_DATE - 14);
  SELECT array_agg(id) INTO camp_ids FROM public.zoric_ad_campaigns WHERE store_id = sid;

  INSERT INTO public.zoric_ad_metrics (store_id, campaign_id, metric_date, spend, impressions, clicks, leads, purchases, confirmed_orders, attributed_revenue)
  SELECT sid, c, d::date, (1500 + random()*2500)::numeric(12,2), (5000 + random()*15000)::int, (150 + random()*400)::int,
         (10 + random()*40)::int, (3 + random()*12)::int, (2 + random()*8)::int, (8000 + random()*30000)::numeric(12,2)
  FROM unnest(camp_ids) c CROSS JOIN generate_series(CURRENT_DATE - 29, CURRENT_DATE, interval '1 day') d;

  SELECT array_agg(id) INTO partner_ids FROM public.zoric_delivery_partners WHERE store_id = sid;

  FOR i IN 1..70 LOOP
    cust := cust_ids[1 + (random()*(array_length(cust_ids,1)-1))::int];
    pid  := prod_ids[1 + (random()*(array_length(prod_ids,1)-1))::int];
    qty  := 1 + (random()*1.4)::int;
    st   := statuses[1 + (random()*(array_length(statuses,1)-1))::int];
    odate := CURRENT_DATE - ((random()*29)::int);
    oid  := gen_random_uuid();
    SELECT selling_price, product_cost + packaging_cost INTO price, cost FROM public.zoric_products WHERE id = pid;
    SELECT full_name, phone, wilaya INTO cname, cphone, cwil FROM public.zoric_customers WHERE id = cust;

    INSERT INTO public.zoric_orders (id, store_id, order_code, customer_id, customer_name, customer_phone, wilaya, city, address, status,
      subtotal, delivery_cost, product_cost, total, estimated_profit, delivery_partner_id, source, campaign_id, payment_method, order_date, created_at)
    VALUES (oid, sid, 'CMD-' || (10400 + i)::text, cust, cname, cphone, cwil, cwil, 'Adresse ' || i, st,
      price*qty, 600, cost*qty, price*qty + 600, (price - cost)*qty - 600,
      partner_ids[1 + (random()*(array_length(partner_ids,1)-1))::int],
      sources[1 + (random()*(array_length(sources,1)-1))::int],
      CASE WHEN random() < 0.7 THEN camp_ids[1 + (random()*(array_length(camp_ids,1)-1))::int] END,
      'cod', odate, odate + make_interval(hours => 8 + (random()*12)::int));

    INSERT INTO public.zoric_order_items (store_id, order_id, product_id, product_name, quantity, unit_price, unit_cost)
    SELECT sid, oid, pid, name, qty, price, cost FROM public.zoric_products WHERE id = pid;

    IF st IN ('shipped','in_delivery','delivered','returned') THEN
      INSERT INTO public.zoric_deliveries (store_id, order_id, partner_id, tracking_code, status, cod_amount, cod_collected, timeline)
      VALUES (sid, oid, partner_ids[1 + (random()*(array_length(partner_ids,1)-1))::int],
        'TRK-' || upper(substring(md5(random()::text),1,8)),
        CASE st WHEN 'shipped' THEN 'picked_up' WHEN 'in_delivery' THEN 'out_for_delivery'
                WHEN 'delivered' THEN 'delivered' ELSE 'returned' END,
        price*qty + 600, st = 'delivered',
        jsonb_build_array(jsonb_build_object('date', odate::text, 'label', 'Colis créé'),
                          jsonb_build_object('date', (odate + 1)::text, 'label', 'Ramassé par le livreur')));
      IF st = 'returned' THEN
        INSERT INTO public.zoric_returns (store_id, order_id, reason, stock_action, financial_impact, return_date)
        VALUES (sid, oid, (ARRAY['Client injoignable','Adresse erronée','Colis refusé','Double commande'])[1 + (random()*3)::int],
                'restock', -600, odate + 3);
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.zoric_expenses (store_id, label, category, amount, expense_date) VALUES
   (sid, 'Emballages', 'Logistique', 12000, CURRENT_DATE - 12),
   (sid, 'Abonnement Shopify', 'Logiciel', 4500, CURRENT_DATE - 20),
   (sid, 'Salaire confirmatrice', 'Équipe', 35000, CURRENT_DATE - 5);

  INSERT INTO public.zoric_notifications (store_id, title, body, severity) VALUES
   (sid, 'Stock faible', '2 produits sont sous le seuil de réapprovisionnement', 'warning'),
   (sid, 'Bienvenue', 'Données de démonstration chargées — supprimez-les depuis Paramètres > Zone de danger.', 'info');

  RETURN 70;
END $$;

-- ============================================================
-- 16. FUNCTION PRIVILEGES
-- ============================================================
REVOKE ALL ON FUNCTION public.zoric_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.zoric_apply_stock_movement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.zoric_sync_customer_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.zoric_has_store_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.zoric_has_store_role(uuid, public.zoric_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.zoric_ensure_workspace() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.zoric_seed_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zoric_has_store_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.zoric_has_store_role(uuid, public.zoric_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.zoric_ensure_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.zoric_seed_demo_data() TO authenticated;

NOTIFY pgrst, 'reload schema';
