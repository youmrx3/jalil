export const fmtDZD = (n: number) =>
  new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " DZD";

export const fmtNum = (n: number) => new Intl.NumberFormat("fr-DZ").format(Math.round(n || 0));

export const fmtPct = (n: number, d = 1) => `${(n || 0).toFixed(d)}%`;

export const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export const fmtDateShort = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  } catch { return iso; }
};

export const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  to_confirm: "À confirmer",
  confirmed: "Confirmée",
  prepared: "Préparée",
  shipped: "Expédiée",
  in_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  returned: "Retournée",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-muted text-foreground/85 border-border",
  to_confirm: "bg-amber-500/12 text-amber-400 border-amber-500/25",
  confirmed: "bg-sky-500/12 text-sky-400 border-sky-500/25",
  prepared: "bg-orange-500/12 text-orange-400 border-orange-500/25",
  shipped: "bg-violet-500/12 text-violet-400 border-violet-500/25",
  in_delivery: "bg-blue-500/12 text-blue-400 border-blue-500/25",
  delivered: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  cancelled: "bg-muted text-muted-foreground border-border",
  returned: "bg-red-500/12 text-red-400 border-red-500/25",
};

