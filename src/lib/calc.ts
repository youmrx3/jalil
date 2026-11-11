import type { Order, Product, B2BClient, Invoice, Settings } from "./store";

export const totalCostPerPiece = (p: Product) =>
  p.cpp + (p.shippingCost || 0) + (p.facebookAdCost || 0) + (p.packagingCost || 0);

export const sellingPrice = (p: Product) =>
  p.sellingPriceOverride ?? totalCostPerPiece(p) + p.desiredProfit;

export const profitPerPiece = (p: Product) => sellingPrice(p) - totalCostPerPiece(p);

export interface ProductStats {
  delivered: number;
  returned: number;
  pending: number;
  revenue: number;
  productCost: number;
  returnCostTotal: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
}

export const productStats = (p: Product, orders: Order[]): ProductStats => {
  const rel = orders.filter((o) => o.productId === p.id || o.productName === p.name);
  const delivered = rel
    .filter((o) => o.status === "Delivered")
    .reduce((s, o) => s + o.quantity, 0);
  const returned = rel
    .filter((o) => o.status === "Returned")
    .reduce((s, o) => s + o.quantity, 0);
  const pending = rel
    .filter((o) => o.status === "Pending" || o.status === "Confirmed" || o.status === "Shipped")
    .reduce((s, o) => s + o.quantity, 0);
  const sp = sellingPrice(p);
  const revenue = sp * delivered;
  // full cost of a delivered piece = purchase + shipping + FB ads + packaging
  const productCost = totalCostPerPiece(p) * delivered;
  const returnCostTotal = p.returnCost * returned;
  const grossProfit = revenue - p.cpp * delivered;
  const netProfit = revenue - productCost - returnCostTotal;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { delivered, returned, pending, revenue, productCost, returnCostTotal, grossProfit, netProfit, margin };
};

export interface Totals {
  revenue: number;
  netProfit: number;
  grossProfit: number;
  productCost: number;
  returnCost: number;
  unitsSold: number;
  delivered: number;
  returned: number;
  returnRate: number;
  totalStock: number;
  lowStock: number;
}

export const businessTotals = (products: Product[], orders: Order[]): Totals => {
  let rev = 0,
    net = 0,
    gross = 0,
    pc = 0,
    rc = 0,
    delivered = 0,
    returned = 0;
  for (const p of products) {
    const s = productStats(p, orders);
    rev += s.revenue;
    net += s.netProfit;
    gross += s.grossProfit;
    pc += s.productCost;
    rc += s.returnCostTotal;
    delivered += s.delivered;
    returned += s.returned;
  }
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock).length;
  const unitsSold = delivered;
  const returnRate = delivered + returned > 0 ? (returned / (delivered + returned)) * 100 : 0;
  return {
    revenue: rev,
    netProfit: net,
    grossProfit: gross,
    productCost: pc,
    returnCost: rc,
    unitsSold,
    delivered,
    returned,
    returnRate,
    totalStock,
    lowStock,
  };
};

export const clientBudgetDZD = (c: B2BClient, s: Settings) =>
  c.adBudgetUSD * (c.fxRateOverride ?? s.fxRate);

export const clientUsdRemaining = (c: B2BClient) =>
  Math.max(0, c.adBudgetUSD - (c.usdSpent || 0));

export const clientUsdProgressPct = (c: B2BClient) =>
  c.adBudgetUSD > 0 ? Math.min(100, ((c.usdSpent || 0) / c.adBudgetUSD) * 100) : 0;

/** Payment I still need to collect from the client for my service fee. */
export const clientPaymentRemaining = (c: B2BClient) =>
  Math.max(0, (c.servicePriceDZD || 0) - (c.amountReceivedDZD || 0));

export const invoiceServiceTotal = (inv: Invoice) =>
  inv.services.filter((s) => s.checked).reduce((sum, s) => sum + (s.price || 0), 0);

export const invoiceTotalDZD = (inv: Invoice, tax: number) => {
  const services = invoiceServiceTotal(inv);
  const budgetDZD = inv.adBudgetUSD * inv.fxRate;
  const subtotal = services + budgetDZD;
  return subtotal * (1 + (tax || 0) / 100);
};

export const monthlySeries = (orders: Order[], products: Product[]) => {
  const map = new Map<string, { revenue: number; profit: number; returns: number; expenses: number }>();
  const priceOf = (o: Order) => {
    const p = products.find((x) => x.id === o.productId || x.name === o.productName);
    return p ? sellingPrice(p) : 0;
  };
  const costOf = (o: Order) => {
    const p = products.find((x) => x.id === o.productId || x.name === o.productName);
    return p ? totalCostPerPiece(p) : 0;
  };
  const returnOf = (o: Order) => {
    const p = products.find((x) => x.id === o.productId || x.name === o.productName);
    return p ? p.returnCost : 0;
  };
  for (const o of orders) {
    const d = new Date(o.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = map.get(key) ?? { revenue: 0, profit: 0, returns: 0, expenses: 0 };
    if (o.status === "Delivered") {
      const rev = priceOf(o) * o.quantity;
      const cost = costOf(o) * o.quantity;
      cur.revenue += rev;
      cur.expenses += cost;
      cur.profit += rev - cost;
    } else if (o.status === "Returned") {
      cur.returns += o.quantity;
      cur.expenses += returnOf(o) * o.quantity;
      cur.profit -= returnOf(o) * o.quantity;
    }
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
};
