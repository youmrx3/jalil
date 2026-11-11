import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------------------------- workspace --------------------------------- */

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId, error } = await context.supabase.rpc("zoric_ensure_workspace");
    if (error) throw new Error(error.message);
    const { data: store } = await context.supabase
      .from("zoric_stores").select("*").eq("id", storeId as string).maybeSingle();
    const { data: members } = await context.supabase
      .from("zoric_store_members").select("*").eq("store_id", storeId as string)
      .order("created_at", { ascending: true });
    return { storeId: storeId as string, store, members: members ?? [], userId: context.userId };
  });

export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const { error } = await context.supabase
      .from("zoric_stores").update(data as never).eq("id", storeId as string);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- products ---------------------------------- */

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const [p, inv] = await Promise.all([
      context.supabase.from("zoric_products").select("*").eq("store_id", storeId as string)
        .order("created_at", { ascending: false }),
      context.supabase.from("zoric_inventory").select("*").eq("store_id", storeId as string),
    ]);
    if (p.error) throw new Error(p.error.message);
    return { storeId: storeId as string, products: p.data ?? [], inventory: inv.data ?? [] };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown>; initialStock?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    if (data.id) {
      const { error } = await context.supabase.from("zoric_products").update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("zoric_products").insert(payload as never).select("id").single();
    if (error) throw new Error(error.message);
    const qty = Number(data.initialStock ?? 0);
    if (qty > 0) {
      await context.supabase.from("zoric_stock_movements").insert({
        store_id: storeId as string, product_id: row.id, quantity: qty,
        reason: "initial", note: "Stock initial", created_by: context.userId,
      } as never);
    } else {
      await context.supabase.from("zoric_inventory").insert({
        store_id: storeId as string, product_id: row.id, warehouse: "Principal", available: 0,
      } as never);
    }
    return { id: row.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.from("zoric_inventory").delete().eq("product_id", data.id);
    await context.supabase.from("zoric_stock_movements").delete().eq("product_id", data.id);
    const { error } = await context.supabase.from("zoric_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------- stocks ----------------------------------- */

export const listStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const [inv, mv] = await Promise.all([
      context.supabase.from("zoric_inventory")
        .select("*, zoric_products(name, sku, selling_price, product_cost)")
        .eq("store_id", storeId as string),
      context.supabase.from("zoric_stock_movements")
        .select("*, zoric_products(name)").eq("store_id", storeId as string)
        .order("created_at", { ascending: false }).limit(50),
    ]);
    if (inv.error) throw new Error(inv.error.message);
    return { inventory: inv.data ?? [], movements: mv.data ?? [] };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; quantity: number; reason: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const { error } = await context.supabase.from("zoric_stock_movements").insert({
      store_id: storeId as string, product_id: data.productId, quantity: Math.round(data.quantity),
      reason: data.reason, note: data.note ?? null, created_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setReorderLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; level: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_inventory")
      .update({ reorder_level: Math.round(data.level) } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- customers --------------------------------- */

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const { data, error } = await context.supabase.from("zoric_customers")
      .select("*").eq("store_id", storeId as string).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    const q = data.id
      ? context.supabase.from("zoric_customers").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_customers").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------- orders ----------------------------------- */

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const [o, items, products, partners, inv, rates] = await Promise.all([
      context.supabase.from("zoric_orders").select("*").eq("store_id", storeId as string)
        .order("order_date", { ascending: false }).limit(500),
      context.supabase.from("zoric_order_items").select("*").eq("store_id", storeId as string),
      context.supabase.from("zoric_products").select("id, name, sku, selling_price, product_cost, packaging_cost")
        .eq("store_id", storeId as string).order("name"),
      context.supabase.from("zoric_delivery_partners").select("*")
        .or(`store_id.is.null,store_id.eq.${storeId as string}`),
      context.supabase.from("zoric_inventory").select("product_id, available").eq("store_id", storeId as string),
      context.supabase.from("zoric_shipping_rates").select("*").eq("store_id", storeId as string),
    ]);
    if (o.error) throw new Error(o.error.message);
    return {
      orders: o.data ?? [], items: items.data ?? [], products: products.data ?? [],
      partners: partners.data ?? [], inventory: inv.data ?? [], rates: rates.data ?? [],
    };
  });



export const saveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    values: Record<string, unknown>;
    items: { product_id: string | null; product_name: string; quantity: number; unit_price: number; unit_cost: number }[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const productCost = data.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const deliveryCost = Number(data.values["delivery_cost"] ?? 0);
    const total = subtotal + deliveryCost;
    const payload = {
      ...data.values,
      store_id: sid,
      subtotal,
      product_cost: productCost,
      delivery_cost: deliveryCost,
      total,
      estimated_profit: subtotal - productCost,
    };

    // --- keep clients in sync: link/create the customer from the order contact ---
    let customerId = (data.values["customer_id"] as string | undefined) || undefined;
    const phone = String(data.values["customer_phone"] ?? "").trim();
    const cname = String(data.values["customer_name"] ?? "").trim();
    if (!customerId && phone) {
      const { data: existing } = await context.supabase.from("zoric_customers")
        .select("id").eq("store_id", sid).eq("phone", phone).maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: created } = await context.supabase.from("zoric_customers").insert({
          store_id: sid, full_name: cname || phone, phone,
          wilaya: (data.values["wilaya"] as string) || null,
          city: (data.values["city"] as string) || null,
          address: (data.values["address"] as string) || null,
        } as never).select("id").single();
        customerId = created?.id;
      }
    }
    if (customerId) (payload as Record<string, unknown>)["customer_id"] = customerId;

    let orderId = data.id;
    const { data: storeRow } = await context.supabase
      .from("zoric_stores").select("order_code_prefix").eq("id", sid).maybeSingle();
    const prefix = (storeRow as { order_code_prefix?: string } | null)?.order_code_prefix || "CMD";
    const code = (data.values["order_code"] as string) || `${prefix}-${Date.now().toString().slice(-8)}`;
    if (orderId) {
      const { error } = await context.supabase.from("zoric_orders").update(payload as never).eq("id", orderId);
      if (error) throw new Error(error.message);
      // diff the stock between previous and new lines so inventory stays exact
      const { data: prev } = await context.supabase.from("zoric_order_items")
        .select("product_id, quantity").eq("order_id", orderId);
      const before = new Map<string, number>();
      for (const it of prev ?? []) {
        if (!it.product_id) continue;
        before.set(it.product_id, (before.get(it.product_id) ?? 0) + Number(it.quantity));
      }
      const after = new Map<string, number>();
      for (const it of data.items) {
        if (!it.product_id) continue;
        after.set(it.product_id, (after.get(it.product_id) ?? 0) + Number(it.quantity));
      }
      const ids = new Set([...before.keys(), ...after.keys()]);
      for (const pid of ids) {
        const diff = (before.get(pid) ?? 0) - (after.get(pid) ?? 0);
        if (diff === 0) continue;
        await context.supabase.from("zoric_stock_movements").insert({
          store_id: sid, product_id: pid, quantity: diff,
          reason: "order_edit", note: `Modification ${code}`, created_by: context.userId,
        } as never);
      }
      await context.supabase.from("zoric_order_items").delete().eq("order_id", orderId);
    } else {
      const { data: row, error } = await context.supabase.from("zoric_orders")
        .insert({ ...payload, order_code: code } as never)
        .select("id").single();
      if (error) throw new Error(error.message);
      orderId = row.id;
      // reserve stock for a new order
      for (const it of data.items) {
        if (!it.product_id) continue;
        await context.supabase.from("zoric_stock_movements").insert({
          store_id: sid, product_id: it.product_id, quantity: -Math.abs(it.quantity),
          reason: "order", note: `Commande ${code}`, created_by: context.userId,
        } as never);
      }
    }



    if (data.items.length > 0) {
      const { error } = await context.supabase.from("zoric_order_items").insert(
        data.items.map((i) => ({ ...i, store_id: sid, order_id: orderId })) as never,
      );
      if (error) throw new Error(error.message);
    }
    return { id: orderId };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const { data: current } = await context.supabase.from("zoric_orders")
      .select("status, order_code").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("zoric_orders")
      .update({ status: data.status } as never).eq("id", data.id);
    if (error) throw new Error(error.message);

    const restock = ["cancelled", "returned"];
    const wasRestocked = current ? restock.includes(current.status) : false;
    if (!wasRestocked && restock.includes(data.status)) {
      const { data: items } = await context.supabase.from("zoric_order_items")
        .select("product_id, quantity").eq("order_id", data.id);
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        await context.supabase.from("zoric_stock_movements").insert({
          store_id: sid, product_id: it.product_id, quantity: Math.abs(it.quantity),
          reason: data.status === "returned" ? "return" : "cancel",
          note: `Retour stock ${current?.order_code ?? ""}`, created_by: context.userId,
        } as never);
      }
    }
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const { data: order } = await context.supabase.from("zoric_orders")
      .select("status, order_code").eq("id", data.id).maybeSingle();
    const alreadyRestocked = order ? ["cancelled", "returned"].includes(order.status) : false;
    const { data: items } = await context.supabase.from("zoric_order_items")
      .select("product_id, quantity").eq("order_id", data.id);
    if (!alreadyRestocked) {
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        await context.supabase.from("zoric_stock_movements").insert({
          store_id: sid, product_id: it.product_id, quantity: Math.abs(Number(it.quantity)),
          reason: "order_delete", note: `Suppression ${order?.order_code ?? ""}`, created_by: context.userId,
        } as never);
      }
    }
    await context.supabase.from("zoric_order_items").delete().eq("order_id", data.id);
    await context.supabase.from("zoric_deliveries").delete().eq("order_id", data.id);
    await context.supabase.from("zoric_returns").delete().eq("order_id", data.id);
    const { error } = await context.supabase.from("zoric_orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/* ------------------------------------- ads ------------------------------------ */

export const listAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const [c, m, p, prods, orders] = await Promise.all([
      context.supabase.from("zoric_ad_campaigns").select("*").eq("store_id", sid)
        .order("created_at", { ascending: false }),
      context.supabase.from("zoric_ad_metrics").select("*").eq("store_id", sid)
        .order("metric_date", { ascending: false }).limit(500),
      context.supabase.from("zoric_ad_platforms").select("*").order("name"),
      context.supabase.from("zoric_products").select("id, name, selling_price").eq("store_id", sid).order("name"),
      context.supabase.from("zoric_orders").select("id, campaign_id, status, total, order_date").eq("store_id", sid).limit(2000),
    ]);
    if (c.error) throw new Error(c.error.message);
    return {
      campaigns: c.data ?? [], metrics: m.data ?? [], platforms: p.data ?? [],
      products: prods.data ?? [], orders: orders.data ?? [],
    };
  });


export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    const q = data.id
      ? context.supabase.from("zoric_ad_campaigns").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_ad_campaigns").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.from("zoric_ad_metrics").delete().eq("campaign_id", data.id);
    const { error } = await context.supabase.from("zoric_ad_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAdMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    const q = data.id
      ? context.supabase.from("zoric_ad_metrics").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_ad_metrics").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_ad_metrics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- deliveries --------------------------------- */

export const listDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const [d, p, o, items, rates, returns] = await Promise.all([
      context.supabase.from("zoric_deliveries")
        .select("*, zoric_orders(order_code, customer_name, customer_phone, wilaya, city, status, total, subtotal, product_cost, delivery_cost, return_cost, delivery_type, order_date)")
        .eq("store_id", sid).order("created_at", { ascending: false }),
      context.supabase.from("zoric_delivery_partners").select("*")
        .or(`store_id.is.null,store_id.eq.${sid}`),
      context.supabase.from("zoric_orders")
        .select("id, order_code, customer_name, wilaya, city, status, total, subtotal, product_cost, delivery_cost, return_cost, delivery_type, order_date")
        .eq("store_id", sid).order("order_date", { ascending: false }).limit(300),
      context.supabase.from("zoric_order_items")
        .select("order_id, product_name, quantity, unit_price, unit_cost").eq("store_id", sid),
      context.supabase.from("zoric_shipping_rates").select("*").eq("store_id", sid),
      context.supabase.from("zoric_returns").select("id, order_id, reason, financial_impact, return_date, stock_action").eq("store_id", sid),
    ]);
    if (d.error) throw new Error(d.error.message);
    return {
      deliveries: d.data ?? [], partners: p.data ?? [], orders: o.data ?? [],
      items: items.data ?? [], rates: rates.data ?? [], returns: returns.data ?? [],
    };
  });


export const saveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string, last_update: new Date().toISOString() };
    const q = data.id
      ? context.supabase.from("zoric_deliveries").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_deliveries").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);

    // sync the linked order status with the shipment state
    const MAP: Record<string, string> = {
      created: "prepared", picked_up: "shipped", in_transit: "in_delivery",
      out_for_delivery: "in_delivery", delivered: "delivered", returned: "returned", failed: "returned",
    };
    const orderId = String(data.values["order_id"] ?? "");
    const next = MAP[String(data.values["status"] ?? "")];
    if (orderId && next) {
      await context.supabase.from("zoric_orders").update({ status: next } as never).eq("id", orderId);
    }
    return { ok: true };
  });


export const deleteDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_deliveries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    const q = data.id
      ? context.supabase.from("zoric_delivery_partners").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_delivery_partners").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------- returns ---------------------------------- */

export const listReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const [r, o] = await Promise.all([
      context.supabase.from("zoric_returns").select("*, zoric_orders(order_code, customer_name, total)")
        .eq("store_id", storeId as string).order("return_date", { ascending: false }),
      context.supabase.from("zoric_orders").select("id, order_code, customer_name, total")
        .eq("store_id", storeId as string).order("order_date", { ascending: false }).limit(200),
    ]);
    if (r.error) throw new Error(r.error.message);
    return { returns: r.data ?? [], orders: o.data ?? [] };
  });

export const saveReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const payload = { ...data.values, store_id: sid };
    const q = data.id
      ? context.supabase.from("zoric_returns").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_returns").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);

    // sync: a new return marks the order as returned and can restock the items
    if (!data.id) {
      const orderId = String(data.values["order_id"] ?? "");
      if (orderId) {
        const { data: order } = await context.supabase.from("zoric_orders")
          .select("status, order_code").eq("id", orderId).maybeSingle();
        const already = order ? ["cancelled", "returned"].includes(order.status) : false;
        if (!already && data.values["stock_action"] === "restock") {
          const { data: items } = await context.supabase.from("zoric_order_items")
            .select("product_id, quantity").eq("order_id", orderId);
          for (const it of items ?? []) {
            if (!it.product_id) continue;
            await context.supabase.from("zoric_stock_movements").insert({
              store_id: sid, product_id: it.product_id, quantity: Math.abs(Number(it.quantity)),
              reason: "return", note: `Retour ${order?.order_code ?? ""}`, created_by: context.userId,
            } as never);
          }
        }
        if (!already) {
          await context.supabase.from("zoric_orders")
            .update({ status: "returned" } as never).eq("id", orderId);
        }
      }
    }
    return { ok: true };
  });


export const deleteReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_returns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- finances ---------------------------------- */

export const listFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const [e, o, a] = await Promise.all([
      context.supabase.from("zoric_expenses").select("*").eq("store_id", storeId as string)
        .order("expense_date", { ascending: false }),
      context.supabase.from("zoric_orders").select("total, product_cost, delivery_cost, estimated_profit, status, order_date")
        .eq("store_id", storeId as string),
      context.supabase.from("zoric_ad_metrics").select("spend, metric_date").eq("store_id", storeId as string),
    ]);
    if (e.error) throw new Error(e.error.message);
    return { expenses: e.data ?? [], orders: o.data ?? [], adSpend: a.data ?? [] };
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const payload = { ...data.values, store_id: storeId as string };
    const q = data.id
      ? context.supabase.from("zoric_expenses").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_expenses").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------ team ------------------------------------ */

export const saveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; email: string; role: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    if (data.id) {
      const { error } = await context.supabase.from("zoric_store_members")
        .update({ role: data.role } as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase.from("zoric_store_members").insert({
      store_id: storeId as string, user_id: context.userId, invited_email: data.email,
      role: data.role, status: "invited",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_store_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- dashboard --------------------------------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const [orders, ads, inv, expenses, store, items] = await Promise.all([
      context.supabase.from("zoric_orders")
        .select("id, order_code, customer_name, wilaya, total, estimated_profit, status, order_date, source, created_at")
        .eq("store_id", sid).order("order_date", { ascending: false }).limit(1000),
      context.supabase.from("zoric_ad_metrics")
        .select("spend, purchases, confirmed_orders, attributed_revenue, metric_date, campaign_id, zoric_ad_campaigns(name, zoric_ad_platforms(name))")
        .eq("store_id", sid),
      context.supabase.from("zoric_inventory").select("available, reorder_level, product_id, zoric_products(name)")
        .eq("store_id", sid),
      context.supabase.from("zoric_expenses").select("amount, expense_date").eq("store_id", sid),
      context.supabase.from("zoric_stores").select("name").eq("id", sid).maybeSingle(),
      context.supabase.from("zoric_order_items").select("order_id, product_name, quantity, unit_price")
        .eq("store_id", sid).limit(3000),
    ]);
    if (orders.error) throw new Error(orders.error.message);
    return {
      storeName: store.data?.name ?? "Ma boutique",
      items: items.data ?? [],
      orders: orders.data ?? [],
      adMetrics: ads.data ?? [],
      inventory: inv.data ?? [],
      expenses: expenses.data ?? [],
    };
  });

/* -------------------------------- settings ------------------------------- */

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId, error } = await context.supabase.rpc("zoric_ensure_workspace");
    if (error) throw new Error(error.message);
    const sid = storeId as string;
    const [store, profiles, partners, members, counts, rates] = await Promise.all([
      context.supabase.from("zoric_stores").select("*").eq("id", sid).maybeSingle(),
      context.supabase.from("zoric_business_profiles").select("*").eq("store_id", sid)
        .order("is_default", { ascending: false }).order("created_at", { ascending: true }),
      context.supabase.from("zoric_delivery_partners").select("*")
        .or(`store_id.is.null,store_id.eq.${sid}`).order("name"),
      context.supabase.from("zoric_store_members").select("*").eq("store_id", sid),
      context.supabase.from("zoric_orders").select("id, status, total").eq("store_id", sid),
      context.supabase.from("zoric_shipping_rates").select("*").eq("store_id", sid).order("wilaya_code"),
    ]);
    return {
      storeId: sid,
      store: store.data,
      profiles: profiles.data ?? [],
      partners: partners.data ?? [],
      members: members.data ?? [],
      orders: counts.data ?? [],
      rates: rates.data ?? [],
      userId: context.userId,
    };
  });


export const saveBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const payload: Record<string, unknown> = { ...data.values, store_id: sid };
    if (payload["is_default"]) {
      await context.supabase.from("zoric_business_profiles")
        .update({ is_default: false } as never).eq("store_id", sid);
    }
    const q = data.id
      ? context.supabase.from("zoric_business_profiles").update(payload as never).eq("id", data.id)
      : context.supabase.from("zoric_business_profiles").insert(payload as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    await context.supabase.from("zoric_business_profiles")
      .update({ is_default: false } as never).eq("store_id", sid);
    const { error } = await context.supabase.from("zoric_business_profiles")
      .update({ is_default: true } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_business_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_delivery_partners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Recompute inventory reorder levels + client counters from live data. */
export const resyncWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const [{ data: store }, { data: orders }, { data: customers }, { data: products }, { data: inv }] =
      await Promise.all([
        context.supabase.from("zoric_stores").select("low_stock_threshold").eq("id", sid).maybeSingle(),
        context.supabase.from("zoric_orders").select("id, customer_id, customer_phone, customer_name, status, total").eq("store_id", sid),
        context.supabase.from("zoric_customers").select("id, phone").eq("store_id", sid),
        context.supabase.from("zoric_products").select("id").eq("store_id", sid),
        context.supabase.from("zoric_inventory").select("id, product_id").eq("store_id", sid),
      ]);

    // 1. every product has an inventory row
    const invByProduct = new Map((inv ?? []).map((i) => [i.product_id, i]));
    for (const p of products ?? []) {
      if (!invByProduct.has(p.id)) {
        await context.supabase.from("zoric_inventory").insert({
          store_id: sid, product_id: p.id, warehouse: "Principal", available: 0,
        } as never);
      }
    }

    // 2. align reorder level with the global low-stock threshold
    const threshold = Number((store as { low_stock_threshold?: number } | null)?.low_stock_threshold ?? 5);
    await context.supabase.from("zoric_inventory")
      .update({ reorder_level: threshold } as never).eq("store_id", sid);

    // 3. attach orphan orders to a client (matched by phone) so counters add up
    const byPhone = new Map((customers ?? []).map((c) => [c.phone, c.id]));
    let linked = 0;
    for (const o of orders ?? []) {
      if (o.customer_id) continue;
      let cid = byPhone.get(o.customer_phone);
      if (!cid && o.customer_phone) {
        const { data: created } = await context.supabase.from("zoric_customers").insert({
          store_id: sid, full_name: o.customer_name, phone: o.customer_phone,
        } as never).select("id").single();
        cid = created?.id;
        if (cid) byPhone.set(o.customer_phone, cid);
      }
      if (cid) {
        await context.supabase.from("zoric_orders").update({ customer_id: cid } as never).eq("id", o.id);
        linked += 1;
      }
    }

    // 4. touch each order so the DB trigger recomputes client counters
    for (const o of orders ?? []) {
      await context.supabase.from("zoric_orders")
        .update({ status: o.status } as never).eq("id", o.id);
    }

    return { ok: true, linked, threshold };
  });

/* ----------------------------------- reports ---------------------------------- */

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const [orders, items, ads, expenses, customers, inv, returns] = await Promise.all([
      context.supabase.from("zoric_orders")
        .select("id, order_code, total, subtotal, product_cost, delivery_cost, estimated_profit, status, order_date, wilaya, source, customer_id")
        .eq("store_id", sid).order("order_date", { ascending: false }).limit(2000),
      context.supabase.from("zoric_order_items")
        .select("order_id, product_id, product_name, quantity, unit_price, unit_cost").eq("store_id", sid),
      context.supabase.from("zoric_ad_metrics").select("spend, metric_date, purchases, attributed_revenue").eq("store_id", sid),
      context.supabase.from("zoric_expenses").select("amount, expense_date, category, label").eq("store_id", sid),
      context.supabase.from("zoric_customers").select("id, full_name, total_spent, total_orders, wilaya").eq("store_id", sid),
      context.supabase.from("zoric_inventory").select("available, reorder_level, product_id, zoric_products(name)").eq("store_id", sid),
      context.supabase.from("zoric_returns").select("financial_impact, return_date, reason").eq("store_id", sid),
    ]);
    if (orders.error) throw new Error(orders.error.message);
    return {
      orders: orders.data ?? [], items: items.data ?? [], adSpend: ads.data ?? [],
      expenses: expenses.data ?? [], customers: customers.data ?? [],
      inventory: inv.data ?? [], returns: returns.data ?? [],
    };
  });

/* ------------------------------- danger zone ---------------------------------- */

export type PurgeScope = "orders" | "products" | "customers" | "ads" | "finance" | "logistics" | "all";

export const purgeStoreData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scopes: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    const s = new Set(data.scopes.includes("all")
      ? ["orders", "products", "customers", "ads", "finance", "logistics"]
      : data.scopes);
    const del = (t: string) => context.supabase.from(t as never).delete().eq("store_id", sid);

    if (s.has("logistics") || s.has("orders")) { await del("zoric_deliveries"); await del("zoric_returns"); }
    if (s.has("orders")) { await del("zoric_order_items"); await del("zoric_orders"); }
    if (s.has("products")) {
      await del("zoric_order_items"); await del("zoric_stock_movements");
      await del("zoric_inventory"); await del("zoric_product_variants"); await del("zoric_products");
    }
    if (s.has("customers")) await del("zoric_customers");
    if (s.has("ads")) { await del("zoric_ad_metrics"); await del("zoric_ad_campaigns"); }
    if (s.has("finance")) await del("zoric_expenses");
    return { ok: true };
  });

/* ------------------------------ shipping rates -------------------------------- */

export const listShippingRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const { data, error } = await context.supabase.from("zoric_shipping_rates")
      .select("*").eq("store_id", storeId as string).order("wilaya_code");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveShippingRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    rows: { wilaya_code: string; wilaya_name: string; home_price: number; stopdesk_price: number; return_price: number }[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    if (data.rows.length === 0) return { ok: true, count: 0 };
    const { error } = await context.supabase.from("zoric_shipping_rates").upsert(
      data.rows.map((r) => ({
        store_id: sid,
        wilaya_code: r.wilaya_code,
        wilaya_name: r.wilaya_name,
        home_price: Number(r.home_price) || 0,
        stopdesk_price: Number(r.stopdesk_price) || 0,
        return_price: Number(r.return_price) || 0,
      })) as never,
      { onConflict: "store_id,wilaya_code" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, count: data.rows.length };
  });

export const deleteShippingRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("zoric_shipping_rates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- CRM sheet import ------------------------------ */

export const fetchRemoteSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    const raw = String(data.url).trim();
    let url = raw;
    const m = raw.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) {
      const gid = raw.match(/[#&?]gid=([0-9]+)/)?.[1] ?? "0";
      url = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
    }
    if (!/^https:\/\//.test(url)) throw new Error("URL invalide (https requis)");
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`Impossible de lire la feuille (${res.status}). Rendez-la accessible via lien.`);
    const text = await res.text();
    if (/<html/i.test(text.slice(0, 400))) {
      throw new Error("La feuille n'est pas publique. Partagez-la en lecture « toute personne disposant du lien ».");
    }
    return { csv: text };
  });

export const importOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    rows: {
      order_code?: string;
      customer_name: string;
      customer_phone: string;
      wilaya?: string;
      city?: string;
      address?: string;
      product_name?: string;
      quantity?: number;
      unit_price?: number;
      delivery_type?: string;
      delivery_cost?: number | null;
      status?: string;
      order_date?: string;
      source?: string;
      internal_note?: string;
    }[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;

    const [{ data: products }, { data: rates }, { data: storeRow }] = await Promise.all([
      context.supabase.from("zoric_products")
        .select("id, name, sku, selling_price, product_cost, packaging_cost").eq("store_id", sid),
      context.supabase.from("zoric_shipping_rates").select("*").eq("store_id", sid),
      context.supabase.from("zoric_stores")
        .select("order_code_prefix, default_delivery_cost").eq("id", sid).maybeSingle(),
    ]);

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const byName = new Map<string, NonNullable<typeof products>[number]>();
    for (const p of products ?? []) {
      byName.set(norm(p.name), p);
      if (p.sku) byName.set(norm(p.sku), p);
    }
    const rateByWilaya = new Map<string, NonNullable<typeof rates>[number]>();
    for (const r of rates ?? []) rateByWilaya.set(norm(r.wilaya_name), r);

    const prefix = (storeRow as { order_code_prefix?: string } | null)?.order_code_prefix || "CMD";
    const defaultDelivery = Number((storeRow as { default_delivery_cost?: number } | null)?.default_delivery_cost ?? 0);

    let imported = 0;
    let skipped = 0;
    let matchedProducts = 0;
    const errors: string[] = [];

    for (const [idx, row] of data.rows.entries()) {
      try {
        const name = String(row.customer_name ?? "").trim();
        const phone = String(row.customer_phone ?? "").trim();
        if (!name && !phone) { skipped++; continue; }

        const code = String(row.order_code ?? "").trim() || `${prefix}-${Date.now().toString().slice(-8)}-${idx + 1}`;
        const { data: dupe } = await context.supabase.from("zoric_orders")
          .select("id").eq("store_id", sid).eq("order_code", code).maybeSingle();
        if (dupe) { skipped++; continue; }

        const product = row.product_name ? byName.get(norm(String(row.product_name))) : undefined;
        if (product) matchedProducts++;
        const qty = Math.max(1, Number(row.quantity) || 1);
        const unitPrice = row.unit_price != null && Number(row.unit_price) > 0
          ? Number(row.unit_price)
          : Number(product?.selling_price ?? 0);
        const unitCost = Number(product?.product_cost ?? 0) + Number(product?.packaging_cost ?? 0);

        const deliveryType = String(row.delivery_type ?? "home") === "stopdesk" ? "stopdesk" : "home";
        const rate = row.wilaya ? rateByWilaya.get(norm(String(row.wilaya))) : undefined;
        const deliveryCost = row.delivery_cost != null && Number(row.delivery_cost) >= 0 && String(row.delivery_cost) !== ""
          ? Number(row.delivery_cost)
          : rate
            ? Number(deliveryType === "stopdesk" ? rate.stopdesk_price : rate.home_price)
            : defaultDelivery;
        const returnCost = rate ? Number(rate.return_price) : 0;

        // link or create the customer so clients stay in sync
        let customerId: string | undefined;
        if (phone) {
          const { data: existing } = await context.supabase.from("zoric_customers")
            .select("id").eq("store_id", sid).eq("phone", phone).maybeSingle();
          if (existing) customerId = existing.id;
          else {
            const { data: created } = await context.supabase.from("zoric_customers").insert({
              store_id: sid, full_name: name || phone, phone,
              wilaya: row.wilaya || null, city: row.city || null, address: row.address || null,
            } as never).select("id").single();
            customerId = created?.id;
          }
        }

        const subtotal = qty * unitPrice;
        const productCost = qty * unitCost;
        const { data: order, error } = await context.supabase.from("zoric_orders").insert({
          store_id: sid,
          order_code: code,
          customer_id: customerId ?? null,
          customer_name: name || phone,
          customer_phone: phone,
          wilaya: row.wilaya || null,
          city: row.city || null,
          address: row.address || null,
          status: String(row.status ?? "new"),
          delivery_type: deliveryType,
          delivery_cost: deliveryCost,
          return_cost: returnCost,
          subtotal,
          product_cost: productCost,
          total: subtotal + deliveryCost,
          estimated_profit: subtotal - productCost,
          payment_method: "cod",
          source: row.source || "import",
          order_date: row.order_date || new Date().toISOString().slice(0, 10),
          internal_note: row.internal_note || null,
        } as never).select("id").single();
        if (error) throw new Error(error.message);

        if (row.product_name || product) {
          await context.supabase.from("zoric_order_items").insert({
            store_id: sid, order_id: order.id,
            product_id: product?.id ?? null,
            product_name: product?.name ?? String(row.product_name ?? "Article"),
            quantity: qty, unit_price: unitPrice, unit_cost: unitCost,
          } as never);
          if (product) {
            await context.supabase.from("zoric_stock_movements").insert({
              store_id: sid, product_id: product.id, quantity: -Math.abs(qty),
              reason: "order", note: `Import CRM ${code}`, created_by: context.userId,
            } as never);
          }
        }
        imported++;
      } catch (e) {
        errors.push(`Ligne ${idx + 2}: ${(e as Error).message}`);
      }
    }

    return { imported, skipped, matchedProducts, errors: errors.slice(0, 10) };
  });

/* ------------------------------- bulk operations ------------------------------ */

const BULK_TABLES = {
  products: "zoric_products",
  customers: "zoric_customers",
  orders: "zoric_orders",
  campaigns: "zoric_ad_campaigns",
  deliveries: "zoric_deliveries",
  returns: "zoric_returns",
  expenses: "zoric_expenses",
  members: "zoric_store_members",
  partners: "zoric_delivery_partners",
} as const;

export type BulkEntity = keyof typeof BULK_TABLES;

export const bulkAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    entity: BulkEntity;
    ids: string[];
    action: "delete" | "update" | "duplicate";
    values?: Record<string, unknown>;
  }) => d)
  .handler(async ({ data, context }) => {
    const table = BULK_TABLES[data.entity];
    if (!table) throw new Error("Section inconnue");
    const ids = (data.ids ?? []).filter(Boolean);
    if (ids.length === 0) return { affected: 0 };

    const { data: storeId } = await context.supabase.rpc("zoric_ensure_workspace");
    const sid = storeId as string;
    let affected = 0;

    if (data.action === "update") {
      const values = { ...(data.values ?? {}) };
      if (Object.keys(values).length === 0) throw new Error("Aucune valeur à appliquer");

      if (data.entity === "orders" && typeof values["status"] === "string") {
        const status = values["status"] as string;
        const restock = ["cancelled", "returned"];
        const { data: current } = await context.supabase.from("zoric_orders")
          .select("id, status, order_code").eq("store_id", sid).in("id", ids);
        const { error } = await context.supabase.from("zoric_orders")
          .update({ status } as never).eq("store_id", sid).in("id", ids);
        if (error) throw new Error(error.message);
        if (restock.includes(status)) {
          for (const o of current ?? []) {
            if (restock.includes(o.status)) continue;
            const { data: items } = await context.supabase.from("zoric_order_items")
              .select("product_id, quantity").eq("order_id", o.id);
            for (const it of items ?? []) {
              if (!it.product_id) continue;
              await context.supabase.from("zoric_stock_movements").insert({
                store_id: sid, product_id: it.product_id, quantity: Math.abs(Number(it.quantity)),
                reason: status === "returned" ? "return" : "cancel",
                note: `Retour stock ${o.order_code}`, created_by: context.userId,
              } as never);
            }
          }
        }
        return { affected: ids.length };
      }

      const { error } = await context.supabase.from(table)
        .update(values as never).eq("store_id", sid).in("id", ids);
      if (error) throw new Error(error.message);
      return { affected: ids.length };
    }

    if (data.action === "delete") {
      if (data.entity === "products") {
        await context.supabase.from("zoric_inventory").delete().eq("store_id", sid).in("product_id", ids);
        await context.supabase.from("zoric_stock_movements").delete().eq("store_id", sid).in("product_id", ids);
      }
      if (data.entity === "orders") {
        const { data: orders } = await context.supabase.from("zoric_orders")
          .select("id, status, order_code").eq("store_id", sid).in("id", ids);
        for (const o of orders ?? []) {
          if (["cancelled", "returned"].includes(o.status)) continue;
          const { data: items } = await context.supabase.from("zoric_order_items")
            .select("product_id, quantity").eq("order_id", o.id);
          for (const it of items ?? []) {
            if (!it.product_id) continue;
            await context.supabase.from("zoric_stock_movements").insert({
              store_id: sid, product_id: it.product_id, quantity: Math.abs(Number(it.quantity)),
              reason: "order_delete", note: `Suppression ${o.order_code}`, created_by: context.userId,
            } as never);
          }
        }
        await context.supabase.from("zoric_order_items").delete().eq("store_id", sid).in("order_id", ids);
        await context.supabase.from("zoric_deliveries").delete().eq("store_id", sid).in("order_id", ids);
        await context.supabase.from("zoric_returns").delete().eq("store_id", sid).in("order_id", ids);
      }
      if (data.entity === "campaigns") {
        await context.supabase.from("zoric_ad_metrics").delete().eq("store_id", sid).in("campaign_id", ids);
      }
      const { error } = await context.supabase.from(table).delete().eq("store_id", sid).in("id", ids);
      if (error) throw new Error(error.message);
      return { affected: ids.length };
    }

    // duplicate
    const { data: rows, error: readErr } = await context.supabase
      .from(table).select("*").eq("store_id", sid).in("id", ids);
    if (readErr) throw new Error(readErr.message);

    for (const row of (rows ?? []) as Record<string, unknown>[]) {
      const copy: Record<string, unknown> = { ...row };
      delete copy["id"]; delete copy["created_at"]; delete copy["updated_at"];

      if (data.entity === "products") copy["name"] = `${String(copy["name"])} (copie)`;
      if (data.entity === "customers") copy["full_name"] = `${String(copy["full_name"])} (copie)`;
      if (data.entity === "campaigns") copy["name"] = `${String(copy["name"])} (copie)`;
      if (data.entity === "orders") {
        copy["order_code"] = `${String(copy["order_code"])}-C${Date.now().toString().slice(-4)}`;
      }
      if (data.entity === "deliveries") {
        copy["tracking_code"] = `${String(copy["tracking_code"])}-C${Date.now().toString().slice(-4)}`;
      }
      if (data.entity === "members" || data.entity === "partners") continue;

      const { data: inserted, error } = await context.supabase
        .from(table).insert(copy as never).select("id").single();
      if (error) throw new Error(error.message);
      affected++;

      if (data.entity === "products") {
        await context.supabase.from("zoric_inventory").insert({
          store_id: sid, product_id: inserted.id, warehouse: "Principal", available: 0,
        } as never);
      }
      if (data.entity === "orders") {
        const { data: items } = await context.supabase.from("zoric_order_items")
          .select("*").eq("order_id", row["id"] as string);
        for (const it of (items ?? []) as Record<string, unknown>[]) {
          const line: Record<string, unknown> = { ...it };
          delete line["id"]; delete line["created_at"];
          line["order_id"] = inserted.id;
          await context.supabase.from("zoric_order_items").insert(line as never);
          if (line["product_id"]) {
            await context.supabase.from("zoric_stock_movements").insert({
              store_id: sid, product_id: line["product_id"], quantity: -Math.abs(Number(line["quantity"])),
              reason: "order", note: `Duplication ${String(copy["order_code"])}`, created_by: context.userId,
            } as never);
          }
        }
      }
    }
    return { affected };
  });
