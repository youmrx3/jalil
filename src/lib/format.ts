export const fmtDZD = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " DZD";

export const fmtUSD = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);

export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n || 0);

export const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

export const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};
