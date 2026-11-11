// Nexus Business — client-side store. Ready to swap to Supabase later.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Cancelled";

export type PaymentStatus = "Not Paid" | "Partially Paid" | "Paid" | "Cancelled";

export type BrandStatus = "Draft" | "In Progress" | "Delivered" | "Paid" | "Cancelled";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  cpp: number;
  desiredProfit: number;
  shippingCost: number;
  facebookAdCost: number;
  packagingCost: number;
  returnCost: number;
  sellingPriceOverride?: number | null;
  stock: number;
  minStock: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderId: string;
  clientName: string;
  phone: string;
  productId?: string;
  productName: string;
  quantity: number;
  address: string;
  date: string;
  status: OrderStatus;
}

export interface B2BClient {
  id: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  country: string;
  industry: string;
  projectName: string;
  adBudgetUSD: number;
  fxRateOverride?: number | null;
  /** Total USD already spent on ads for this client (0..adBudgetUSD). */
  usdSpent: number;
  /** Duration in days the ad budget is planned to be spent over (informational). */
  durationDays?: number;
  /** Agreed service fee I charge the client (independent from ad budget), in DZD. */
  servicePriceDZD: number;
  /** Amount received from the client toward the service fee, in DZD. */
  amountReceivedDZD: number;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface InvoiceService {
  id: string;
  name: string;
  price: number;
  note?: string;
  checked: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  clientName: string;
  company: string;
  project: string;
  adBudgetUSD: number;
  fxRate: number;
  services: InvoiceService[];
  paymentStatus: PaymentStatus;
  notes?: string;
}

/** A reusable service the user saved to avoid re-typing on future invoices. */
export interface SavedService {
  id: string;
  name: string;
  price: number;
  note?: string;
  category?: "agency" | "branding" | "custom";
}

/** A brand-identity deliverable line saved once and reused inside packages/projects. */
export interface BrandDeliverable {
  name: string;
  price: number;
  note?: string;
}

/** A reusable branding package (e.g. "Starter Identity Pack"). */
export interface BrandPackage {
  id: string;
  name: string;
  description?: string;
  deliverables: BrandDeliverable[];
  price: number; // total DZD
  priceUSD?: number;
}

/** A brand identity project sold to a specific client. */
export interface BrandProject {
  id: string;
  number: string;
  date: string;
  clientName: string;
  company: string;
  phone?: string;
  email?: string;
  packageId?: string;
  packageName: string;
  deliverables: BrandDeliverable[];
  priceDZD: number;
  priceUSD: number;
  fxRate: number;
  depositDZD: number;
  status: BrandStatus;
  notes?: string;
}

export interface Settings {
  companyName: string;
  logoDataUrl?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyRC?: string; // registre de commerce
  companyNIF?: string;
  companyAI?: string;
  companyBank?: string; // e.g. "BNA — RIB 001 ..."
  fxRate: number;
  defaultReturnCost: number;
  defaultMargin: number;
  invoiceFooter: string;
  taxPercent: number;
  language: "en" | "fr" | "ar";
  theme: "light" | "dark";
}

export const DEFAULT_SERVICES = [
  "Ad Copywriting",
  "Full Ads Management",
  "Marketing Angle Research",
  "SWOT Marketing Analysis",
  "STP Analysis",
  "Full Marketing Strategy",
  "Content Strategy",
  "Creative Direction",
  "Funnel Strategy",
  "Landing Page Consultation",
];

const uid = () => Math.random().toString(36).slice(2, 10);

const genSku = (name: string, existing: Product[]) => {
  const base =
    (name || "PRD")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 10) || "PRD";
  let i = 1;
  let sku = `${base}-${String(i).padStart(3, "0")}`;
  const taken = new Set(existing.map((p) => p.sku));
  while (taken.has(sku)) {
    i++;
    sku = `${base}-${String(i).padStart(3, "0")}`;
  }
  return sku;
};

const consumesStock = (s: OrderStatus) => s !== "Cancelled" && s !== "Returned";

interface AppState {
  products: Product[];
  orders: Order[];
  clients: B2BClient[];
  invoices: Invoice[];
  savedServices: SavedService[];
  savedPackages: BrandPackage[];
  brandProjects: BrandProject[];
  settings: Settings;

  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addOrder: (o: Omit<Order, "id">) => void;
  addOrders: (list: Omit<Order, "id">[]) => void;
  updateOrder: (id: string, o: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  clearOrders: () => void;

  addClient: (c: Omit<B2BClient, "id">) => void;
  updateClient: (id: string, c: Partial<B2BClient>) => void;
  deleteClient: (id: string) => void;

  addInvoice: (i: Omit<Invoice, "id">) => string;
  updateInvoice: (id: string, i: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  addSavedService: (s: Omit<SavedService, "id">) => void;
  updateSavedService: (id: string, s: Partial<SavedService>) => void;
  deleteSavedService: (id: string) => void;

  addSavedPackage: (p: Omit<BrandPackage, "id">) => void;
  updateSavedPackage: (id: string, p: Partial<BrandPackage>) => void;
  deleteSavedPackage: (id: string) => void;

  addBrandProject: (p: Omit<BrandProject, "id">) => string;
  updateBrandProject: (id: string, p: Partial<BrandProject>) => void;
  deleteBrandProject: (id: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
  seedDemo: () => void;
  resetAll: () => void;
}

const initialSettings: Settings = {
  companyName: "Nexus Business",
  fxRate: 250.0,
  defaultReturnCost: 200,
  defaultMargin: 30,
  invoiceFooter: "Thank you for your business.",
  taxPercent: 0,
  language: "en",
  theme: "light",
};

function adjustStock(products: Product[], deltas: Map<string, number>): Product[] {
  if (deltas.size === 0) return products;
  return products.map((p) => {
    const d = deltas.get(p.id);
    if (!d) return p;
    return { ...p, stock: Math.max(0, p.stock + d) };
  });
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      orders: [],
      clients: [],
      invoices: [],
      savedServices: DEFAULT_SERVICES.map((n) => ({ id: uid(), name: n, price: 0, category: "agency" as const })),
      savedPackages: [],
      brandProjects: [],
      settings: initialSettings,

      addProduct: (p) =>
        set({
          products: [
            ...get().products,
            { ...p, sku: p.sku?.trim() || genSku(p.name, get().products), id: uid() },
          ],
        }),
      updateProduct: (id, p) =>
        set({ products: get().products.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteProduct: (id) => set({ products: get().products.filter((x) => x.id !== id) }),

      addOrder: (o) => {
        const order = { ...o, id: uid() };
        const deltas = new Map<string, number>();
        if (order.productId && consumesStock(order.status)) {
          deltas.set(order.productId, -order.quantity);
        }
        set({ orders: [...get().orders, order], products: adjustStock(get().products, deltas) });
      },
      addOrders: (list) => {
        const withIds = list.map((o) => ({ ...o, id: uid() }));
        const deltas = new Map<string, number>();
        for (const o of withIds) {
          if (o.productId && consumesStock(o.status)) {
            deltas.set(o.productId, (deltas.get(o.productId) ?? 0) - o.quantity);
          }
        }
        set({ orders: [...get().orders, ...withIds], products: adjustStock(get().products, deltas) });
      },
      updateOrder: (id, o) => {
        const prev = get().orders.find((x) => x.id === id);
        if (!prev) return;
        const next = { ...prev, ...o };
        const deltas = new Map<string, number>();
        const prevQty = consumesStock(prev.status) && prev.productId ? prev.quantity : 0;
        const nextQty = consumesStock(next.status) && next.productId ? next.quantity : 0;
        if (prev.productId === next.productId) {
          if (prev.productId) {
            const delta = prevQty - nextQty;
            if (delta !== 0) deltas.set(prev.productId, delta);
          }
        } else {
          if (prev.productId && prevQty) deltas.set(prev.productId, prevQty);
          if (next.productId && nextQty)
            deltas.set(next.productId, (deltas.get(next.productId) ?? 0) - nextQty);
        }
        set({
          orders: get().orders.map((x) => (x.id === id ? next : x)),
          products: adjustStock(get().products, deltas),
        });
      },
      deleteOrder: (id) => {
        const prev = get().orders.find((x) => x.id === id);
        const deltas = new Map<string, number>();
        if (prev?.productId && consumesStock(prev.status)) {
          deltas.set(prev.productId, prev.quantity);
        }
        set({
          orders: get().orders.filter((x) => x.id !== id),
          products: adjustStock(get().products, deltas),
        });
      },
      clearOrders: () => set({ orders: [] }),

      addClient: (c) => set({ clients: [...get().clients, { ...c, id: uid() }] }),
      updateClient: (id, c) =>
        set({ clients: get().clients.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      deleteClient: (id) => set({ clients: get().clients.filter((x) => x.id !== id) }),

      addInvoice: (i) => {
        const id = uid();
        set({ invoices: [...get().invoices, { ...i, id }] });
        return id;
      },
      updateInvoice: (id, i) =>
        set({ invoices: get().invoices.map((x) => (x.id === id ? { ...x, ...i } : x)) }),
      deleteInvoice: (id) => set({ invoices: get().invoices.filter((x) => x.id !== id) }),

      addSavedService: (s) =>
        set({ savedServices: [...get().savedServices, { ...s, id: uid() }] }),
      updateSavedService: (id, s) =>
        set({ savedServices: get().savedServices.map((x) => (x.id === id ? { ...x, ...s } : x)) }),
      deleteSavedService: (id) =>
        set({ savedServices: get().savedServices.filter((x) => x.id !== id) }),

      addSavedPackage: (p) => set({ savedPackages: [...get().savedPackages, { ...p, id: uid() }] }),
      updateSavedPackage: (id, p) =>
        set({ savedPackages: get().savedPackages.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      deleteSavedPackage: (id) =>
        set({ savedPackages: get().savedPackages.filter((x) => x.id !== id) }),

      addBrandProject: (p) => {
        const id = uid();
        set({ brandProjects: [...get().brandProjects, { ...p, id }] });
        return id;
      },
      updateBrandProject: (id, p) =>
        set({
          brandProjects: get().brandProjects.map((x) => (x.id === id ? { ...x, ...p } : x)),
        }),
      deleteBrandProject: (id) =>
        set({ brandProjects: get().brandProjects.filter((x) => x.id !== id) }),

      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      resetAll: () =>
        set({
          products: [],
          orders: [],
          clients: [],
          invoices: [],
          savedServices: DEFAULT_SERVICES.map((n) => ({
            id: uid(),
            name: n,
            price: 0,
            category: "agency" as const,
          })),
          savedPackages: [],
          brandProjects: [],
          settings: initialSettings,
        }),

      seedDemo: () => {
        const products: Product[] = [
          {
            id: uid(),
            name: "Smart Watch X1",
            sku: "SW-X1",
            category: "Electronics",
            supplier: "AliTech",
            cpp: 3500,
            desiredProfit: 2500,
            shippingCost: 300,
            facebookAdCost: 800,
            packagingCost: 150,
            returnCost: 400,
            stock: 45,
            minStock: 10,
            notes: "",
          },
          {
            id: uid(),
            name: "Wireless Earbuds Pro",
            sku: "WE-PRO",
            category: "Electronics",
            supplier: "AliTech",
            cpp: 2200,
            desiredProfit: 1800,
            shippingCost: 200,
            facebookAdCost: 600,
            packagingCost: 100,
            returnCost: 300,
            stock: 8,
            minStock: 15,
            notes: "Low stock",
          },
          {
            id: uid(),
            name: "Leather Wallet",
            sku: "LW-01",
            category: "Fashion",
            supplier: "LocalCraft",
            cpp: 900,
            desiredProfit: 1100,
            shippingCost: 150,
            facebookAdCost: 400,
            packagingCost: 80,
            returnCost: 100,
            stock: 120,
            minStock: 20,
            notes: "",
          },
        ];
        const [p1, p2, p3] = products;
        const today = new Date();
        const day = (n: number) =>
          new Date(today.getFullYear(), today.getMonth(), today.getDate() - n).toISOString();
        const mkOrder = (prod: Product, n: number, status: OrderStatus, qty = 1): Omit<Order, "id"> => ({
          orderId: `ORD-${1000 + n}`,
          clientName: `Client ${n}`,
          phone: `+2135${String(10000000 + n).slice(-8)}`,
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          address: "Algiers",
          date: day(n),
          status,
        });
        const orders = [
          mkOrder(p1, 1, "Delivered", 1),
          mkOrder(p1, 2, "Delivered", 2),
          mkOrder(p1, 3, "Returned", 1),
          mkOrder(p2, 4, "Delivered", 1),
          mkOrder(p2, 5, "Shipped", 1),
          mkOrder(p3, 6, "Delivered", 3),
          mkOrder(p3, 7, "Delivered", 1),
          mkOrder(p3, 8, "Pending", 2),
          mkOrder(p1, 15, "Delivered", 1),
          mkOrder(p2, 25, "Delivered", 2),
        ].map((o) => ({ ...o, id: uid() }));
        const clients: B2BClient[] = [
          {
            id: uid(),
            company: "Bright Digital",
            contactPerson: "Sara Meddour",
            phone: "+213555111222",
            email: "sara@brightdigital.co",
            country: "Algeria",
            industry: "E-commerce",
            projectName: "Q4 Meta Ads Push",
            adBudgetUSD: 3000,
            usdSpent: 1200,
            durationDays: 30,
            servicePriceDZD: 120000,
            amountReceivedDZD: 60000,
            paymentStatus: "Partially Paid",
          },
          {
            id: uid(),
            company: "Atlas Realty",
            contactPerson: "Karim B.",
            phone: "+213770333444",
            email: "karim@atlas.dz",
            country: "Algeria",
            industry: "Real Estate",
            projectName: "Lead Gen Funnel",
            adBudgetUSD: 1500,
            usdSpent: 1500,
            durationDays: 45,
            servicePriceDZD: 90000,
            amountReceivedDZD: 90000,
            paymentStatus: "Paid",
          },
        ];
        const savedPackages: BrandPackage[] = [
          {
            id: uid(),
            name: "Starter Identity Pack",
            description: "Perfect for new businesses launching their brand.",
            price: 45000,
            priceUSD: 180,
            deliverables: [
              { name: "Logo design (3 concepts)", price: 20000 },
              { name: "Color palette & typography", price: 8000 },
              { name: "Business card design", price: 7000 },
              { name: "Brand guidelines (PDF)", price: 10000 },
            ],
          },
          {
            id: uid(),
            name: "Premium Brand System",
            description: "Complete identity + social kit for scaling brands.",
            price: 120000,
            priceUSD: 480,
            deliverables: [
              { name: "Full logo system", price: 35000 },
              { name: "Brand strategy document", price: 20000 },
              { name: "Social media templates (10)", price: 25000 },
              { name: "Packaging concept", price: 20000 },
              { name: "Complete brand book", price: 20000 },
            ],
          },
        ];
        set({ products, orders, clients, savedPackages });
      },
    }),
    { name: "nexus-business-v1" },
  ),
);
