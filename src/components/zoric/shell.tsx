import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutGrid, Activity, ShoppingBag, Package, Users, Warehouse, Truck, Undo2,
  Wallet, Megaphone, FileBarChart2, UserCog, Settings as SettingsIcon, LifeBuoy,
  Search, Bell, Sun, Moon, Plus, Menu, X, PanelLeftClose, PanelLeftOpen, LogOut, Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { getOverview } from "@/lib/zoric/data.functions";
import { fmtDZD } from "@/lib/zoric/format";
import { toast } from "sonner";

type NavItem = { url: string; label: string; icon: typeof LayoutGrid; badge?: "toConfirm" | "lowStock" | "returns" };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Vente",
    items: [
      { url: "/zoric", label: "Vue d'ensemble", icon: LayoutGrid },
      { url: "/zoric/ventes", label: "Ventes", icon: Activity },
      { url: "/zoric/commandes", label: "Commandes", icon: ShoppingBag, badge: "toConfirm" },
      { url: "/zoric/produits", label: "Produits", icon: Package, badge: "lowStock" },
      { url: "/zoric/clients", label: "Clients", icon: Users },
    ],
  },
  {
    label: "Opérations",
    items: [
      { url: "/zoric/stocks", label: "Stocks", icon: Warehouse },
      { url: "/zoric/livraisons", label: "Livraisons", icon: Truck },
      { url: "/zoric/retours", label: "Retours", icon: Undo2, badge: "returns" },
    ],
  },
  {
    label: "Argent & équipe",
    items: [
      { url: "/zoric/finances", label: "Finances", icon: Wallet },
      { url: "/zoric/publicites", label: "Publicités", icon: Megaphone },
      { url: "/zoric/rapports", label: "Rapports", icon: FileBarChart2 },
      { url: "/zoric/equipe", label: "Équipe", icon: UserCog },
    ],
  },
];

const NAV = GROUPS.flatMap((g) => g.items);

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

/** Shared overview query — cached and reused by the dashboard and the sales page. */
export function useOverview() {
  const fetchData = useServerFn(getOverview);
  return useQuery({ queryKey: ["zoric-overview"], queryFn: () => fetchData(), staleTime: 60_000 });
}

function useUser() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, string>;
      setUser({ name: meta.full_name || meta.name || (u.email ?? "").split("@")[0], email: u.email ?? "" });
    });
  }, []);
  return user;
}

function initials(name: string) {
  return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "Z";
}

function useTheme() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.setItem("zoric-theme", next ? "light" : "dark"); } catch { /* ignore */ }
  };
  return { light, toggle };
}

export function ZoricShell({
  children, title, subtitle, actions, eyebrow,
}: { children: ReactNode; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const user = useUser();
  const { light, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data } = useOverview();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const orders = data?.orders ?? [];
    const today = TODAY_ISO();
    const live = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
    const todayOrders = live.filter((o) => o.order_date === today);
    const todayTakings = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    // Daily goal = 30-day average daily takings + 15 %, rounded to the nearest 1 000.
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const last30 = live.filter((o) => o.order_date >= since).reduce((s, o) => s + Number(o.total), 0);
    const goal = Math.max(1000, Math.round(((last30 / 30) * 1.15) / 1000) * 1000);
    return {
      toConfirm: orders.filter((o) => o.status === "new" || o.status === "to_confirm").length,
      lowStock: (data?.inventory ?? []).filter((i) => Number(i.available) <= Number(i.reorder_level)).length,
      returns: orders.filter((o) => o.status === "returned").length,
      todayTakings, todayCount: todayOrders.length, goal,
    };
  }, [data]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  };

  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const alerts = [
    counts.toConfirm > 0 && { title: `${counts.toConfirm} commandes à confirmer`, body: "Appels de confirmation en attente", to: "/zoric/commandes" },
    counts.lowStock > 0 && { title: `${counts.lowStock} produits en stock faible`, body: "Pensez à réapprovisionner", to: "/zoric/stocks" },
    counts.returns > 0 && { title: `${counts.returns} colis retournés`, body: "À traiter dans Retours", to: "/zoric/retours" },
  ].filter(Boolean) as { title: string; body: string; to: string }[];

  const isActive = (url: string) => pathname === url || pathname === url + "/" || (url !== "/zoric" && pathname.startsWith(url));
  const pct = Math.min(100, Math.round((counts.todayTakings / counts.goal) * 100));

  const sidebar = (
    <aside
      className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen ${collapsed ? "lg:w-[78px]" : "w-[248px]"} shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-[width,transform] duration-300`}
    >
      {/* Brand */}
      <div className="h-[68px] px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-ember-gradient flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(255,90,31,0.8)]">
          <Flame className="h-[18px] w-[18px]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight text-foreground">Zoric</div>
            <div className="text-[11px] text-muted-foreground truncate">{data?.storeName ?? "Commerce OS"}</div>
          </div>
        )}
        <button
          className="hidden lg:flex ml-auto h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Réduire la barre latérale"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button className="lg:hidden ml-auto text-muted-foreground" onClick={() => setMobileOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></button>
      </div>

      {/* New */}
      <div className="px-3 pb-3">
        <Link
          to="/zoric/commandes"
          search={{ new: 1 } as never}
          className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-surface-2 text-[13px] font-semibold text-foreground hover:border-primary/50 transition"
        >
          <Plus className="h-4 w-4 text-primary" />
          {!collapsed && <><span>Nouvelle commande</span><kbd className="ml-auto text-[10px] font-semibold text-muted-foreground border border-border rounded-md px-1.5 py-0.5">N</kbd></>}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {GROUPS.map((g) => (
          <div key={g.label}>
            {!collapsed && <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 px-2 pb-2">{g.label}</div>}
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const active = isActive(n.url);
                const badge = n.badge ? counts[n.badge] : 0;
                return (
                  <Link
                    key={n.url}
                    to={n.url}
                    onClick={() => setMobileOpen(false)}
                    title={n.label}
                    className={`group flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium transition ${
                      active
                        ? "bg-ember-gradient text-white shadow-[0_10px_24px_-12px_rgba(255,90,31,0.9)]"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
                    }`}
                  >
                    <n.icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                    {!collapsed && <span className="truncate">{n.label}</span>}
                    {!collapsed && badge > 0 && (
                      <span className={`ml-auto min-w-6 h-5 px-1.5 rounded-md text-[10.5px] font-semibold flex items-center justify-center tabular ${active ? "bg-white/20 text-white" : "bg-surface-2 border border-border text-muted-foreground"}`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3 space-y-0.5">
        <Link to="/zoric/parametres" className={`flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium transition ${isActive("/zoric/parametres") ? "bg-ember-gradient text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground"}`}>
          <SettingsIcon className="h-[17px] w-[17px]" /> {!collapsed && "Paramètres"}
        </Link>
        <a href="mailto:support@zoric.app" className="flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground">
          <LifeBuoy className="h-[17px] w-[17px] text-muted-foreground" /> {!collapsed && "Aide"}
        </a>
      </div>

      {/* Today so far */}
      {!collapsed && (
        <div className="m-3 mt-1 p-3 rounded-2xl border border-border bg-surface-2 flex items-center gap-3">
          <ProgressRing value={pct} />
          <div className="min-w-0">
            <div className="text-[10.5px] text-muted-foreground">Aujourd'hui</div>
            <div className="text-[15px] font-bold text-foreground tabular truncate">{fmtDZD(counts.todayTakings)}</div>
            <div className="text-[10.5px] text-muted-foreground truncate">{counts.todayCount} commandes · objectif {fmtDZD(counts.goal)}</div>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {sidebar}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[68px] sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-7 bg-background/85 backdrop-blur-md">
          <button className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2.5 h-10 w-full max-w-[380px] px-3.5 rounded-xl border border-border bg-surface text-[13px] text-muted-foreground hover:border-input transition"
          >
            <Search className="h-4 w-4" />
            <span>Rechercher pages, commandes…</span>
            <kbd className="ml-auto text-[10px] font-semibold border border-border rounded-md px-1.5 py-0.5">Ctrl K</kbd>
          </button>
          <button className="md:hidden h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground" onClick={() => setPaletteOpen(true)} aria-label="Rechercher"><Search className="h-4 w-4" /></button>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-surface text-[12.5px] text-foreground capitalize">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(255,90,31,0.9)]" />
              {todayLabel}
            </div>
            <button onClick={toggle} className="h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Changer de thème">
              {light ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-10 w-10 rounded-xl border border-border bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Notifications">
                  <Bell className="h-[17px] w-[17px]" />
                  {alerts.length > 0 && <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">{alerts.length}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-1.5">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alerts.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Tout est à jour.</div>}
                {alerts.map((a) => (
                  <DropdownMenuItem key={a.title} className="flex-col items-start rounded-xl" onClick={() => navigate({ to: a.to })}>
                    <div className="font-medium text-sm">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.body}</div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 flex items-center gap-2.5 pl-1 pr-2 rounded-xl hover:bg-surface">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ffb08a] to-[#ff5a1f] flex items-center justify-center text-[11px] font-bold text-white">{initials(user?.name ?? "")}</div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-[12.5px] font-semibold text-foreground max-w-[140px] truncate">{user?.name ?? "…"}</div>
                    <div className="text-[10.5px] text-muted-foreground">Propriétaire</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-56">
                <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/zoric/parametres" })}><SettingsIcon className="h-4 w-4 mr-2" /> Paramètres</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-7 pb-10 pt-3 min-w-0">
          {(title || subtitle || actions) && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4 animate-fade-up">
              <div className="min-w-0">
                {eyebrow && <div className="text-[13px] text-muted-foreground mb-1">{eyebrow}</div>}
                {title && <h1 className="text-[28px] lg:text-[34px] font-bold text-foreground tracking-[-0.02em] leading-tight">{title}</h1>}
                {subtitle && <p className="text-[13px] text-muted-foreground mt-1.5">{subtitle}</p>}
              </div>
              {actions && <div className="sm:ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Aller à…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Pages">
            {[...NAV, { url: "/zoric/parametres", label: "Paramètres", icon: SettingsIcon }].map((n) => (
              <CommandItem key={n.url} value={n.label} onSelect={() => { setPaletteOpen(false); navigate({ to: n.url }); }}>
                <n.icon className="h-4 w-4 mr-2" /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {(data?.orders?.length ?? 0) > 0 && (
            <CommandGroup heading="Commandes récentes">
              {data!.orders.slice(0, 30).map((o) => (
                <CommandItem key={o.id} value={`${o.order_code} ${o.customer_name}`} onSelect={() => { setPaletteOpen(false); navigate({ to: "/zoric/commandes" }); }}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> {o.order_code} — {o.customer_name}
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDZD(Number(o.total))}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--ember)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10.5px] font-bold text-foreground tabular">{value}%</div>
    </div>
  );
}

export function ZoricBanner({ title, cta, onClick }: { title: string; cta?: string; onClick?: () => void }) {
  return (
    <div className="mb-6 rounded-2xl bg-ember-gradient px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="text-white font-semibold text-[15px] min-w-0">{title}</p>
      {cta && (
        <button onClick={onClick} className="sm:ml-auto h-9 px-4 rounded-xl bg-white text-[#d9400e] text-sm font-semibold hover:bg-white/90 shrink-0">{cta}</button>
      )}
    </div>
  );
}

export function StatusPill({ status, label, className = "" }: { status: "success" | "warning" | "error" | "info" | "neutral"; label: string; className?: string }) {
  const colors = {
    success: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
    warning: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    error: "bg-red-500/12 text-red-400 border-red-500/25",
    info: "bg-orange-500/12 text-orange-400 border-orange-500/25",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  const dot = { success: "bg-emerald-400", warning: "bg-amber-400", error: "bg-red-400", info: "bg-orange-400", neutral: "bg-muted-foreground" };
  return (
    <Badge variant="outline" className={`${colors[status]} gap-1.5 rounded-full font-medium text-[11px] px-2.5 py-0.5 ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {label}
    </Badge>
  );
}
