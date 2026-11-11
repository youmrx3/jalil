import { ArrowRight, Package2, Phone } from "lucide-react";
import { fmtDZD } from "@/lib/zoric/format";

type Order = {
  id: string; order_code: string; customer_name: string; customer_phone: string;
  status: string; total: number | string; source: string | null; order_date: string;
  created_at: string; wilaya: string | null;
};
type Item = { order_id: string; quantity: number };

const COLUMNS: { key: string; label: string; dot: string; statuses: string[]; next?: { status: string; label: string } }[] = [
  { key: "new", label: "Nouvelles", dot: "bg-primary", statuses: ["new", "to_confirm"], next: { status: "confirmed", label: "Confirmer" } },
  { key: "packing", label: "Préparation", dot: "bg-amber-400", statuses: ["confirmed", "prepared"], next: { status: "shipped", label: "Expédier" } },
  { key: "road", label: "En route", dot: "bg-sky-400", statuses: ["shipped", "in_delivery"], next: { status: "delivered", label: "Livrée" } },
  { key: "done", label: "Livrées", dot: "bg-emerald-400", statuses: ["delivered"] },
];

const SOURCE_LABEL: Record<string, string> = { meta: "Meta", tiktok: "TikTok", organic: "Organique", manual: "Manuel", google: "Google", snapchat: "Snap" };

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  return `il y a ${d} j`;
}

export function DispatchBoard({
  orders, items, onAdvance, onOpen, busyId,
}: {
  orders: Order[]; items: Item[];
  onAdvance: (id: string, status: string) => void;
  onOpen: (id: string) => void;
  busyId?: string | null;
}) {
  const qtyByOrder = new Map<string, number>();
  items.forEach((i) => qtyByOrder.set(i.order_id, (qtyByOrder.get(i.order_id) ?? 0) + Number(i.quantity)));

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(270px,1fr)] gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
      {COLUMNS.map((col, ci) => {
        const list = orders.filter((o) => col.statuses.includes(o.status));
        const sum = list.reduce((s, o) => s + Number(o.total), 0);
        const shown = col.key === "done" ? list.slice(0, 25) : list;
        return (
          <section key={col.key} className="panel p-3 min-h-[420px] snap-start flex flex-col animate-fade-up" style={{ animationDelay: `${ci * 60}ms` }}>
            <header className="flex items-center gap-2 px-1.5 pb-3">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              <h3 className="text-[13px] font-semibold text-foreground">{col.label}</h3>
              <span className="h-5 min-w-5 px-1.5 rounded-md bg-surface-2 border border-border text-[10.5px] font-semibold text-muted-foreground flex items-center justify-center tabular">{list.length}</span>
              <span className="ml-auto text-[12px] text-muted-foreground tabular">{fmtDZD(sum)}</span>
            </header>
            <div className="space-y-2.5 flex-1">
              {shown.length === 0 && <div className="text-xs text-muted-foreground px-2 py-6 text-center">Rien ici.</div>}
              {shown.map((o) => {
                const qty = qtyByOrder.get(o.id) ?? 0;
                return (
                  <article
                    key={o.id}
                    className={`group rounded-xl border bg-surface-2 p-3 transition hover:border-primary/40 ${col.key === "new" ? "border-l-2 border-l-primary border-border" : "border-border"} ${col.key === "done" ? "opacity-70 hover:opacity-100" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <button onClick={() => onOpen(o.id)} className="text-[12px] font-semibold text-muted-foreground hover:text-foreground tabular">{o.order_code}</button>
                      {o.source && (
                        <span className="ml-auto text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/25">
                          {SOURCE_LABEL[o.source] ?? o.source}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[14px] font-semibold text-foreground truncate">{o.customer_name}</div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Package2 className="h-3.5 w-3.5" /> {qty || 1} article{qty > 1 ? "s" : ""}</span>
                      {o.wilaya && <span className="truncate">{o.wilaya}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[14px] font-bold text-foreground tabular">{fmtDZD(Number(o.total))}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{timeAgo(o.created_at ?? o.order_date)}</span>
                      {col.next ? (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => onAdvance(o.id, col.next!.status)}
                          className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border bg-card text-[11.5px] font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50 transition"
                        >
                          {col.next.label} <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <a href={`tel:${o.customer_phone}`} className="ml-auto h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Appeler">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
              {col.key === "done" && list.length > shown.length && (
                <div className="text-[11px] text-muted-foreground text-center py-2">+ {list.length - shown.length} autres</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
