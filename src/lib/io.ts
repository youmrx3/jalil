import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderStatus } from "./store";

export function exportToExcel(filename: string, sheets: Record<string, unknown[]>) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows as object[]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportTableToPDF(title: string, columns: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [columns],
    body: rows.map((r) => r.map((c) => String(c))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 82] },
  });
  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

export async function importOrdersFile(file: File): Promise<Omit<Order, "id">[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const pick = (row: Record<string, unknown>, keys: string[]) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(norm(k))) return String(row[k] ?? "").trim();
    }
    return "";
  };
  const validStatuses: OrderStatus[] = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Returned",
    "Cancelled",
  ];
  return rows
    .map((r) => {
      const statusRaw = pick(r, ["status", "orderstatus"]);
      const status = (validStatuses.find((s) => s.toLowerCase() === statusRaw.toLowerCase()) ??
        "Pending") as OrderStatus;
      const dateRaw = pick(r, ["date", "orderdate", "createdat"]);
      let date = new Date().toISOString();
      if (dateRaw) {
        const d = new Date(dateRaw);
        if (!isNaN(d.getTime())) date = d.toISOString();
      }
      return {
        orderId: pick(r, ["orderid", "id", "reference", "ref"]) || `ORD-${Date.now()}`,
        clientName: pick(r, ["clientname", "customer", "customername", "name", "fullname"]),
        phone: pick(r, ["phone", "phonenumber", "mobile", "tel"]),
        productName: pick(r, ["product", "productname", "item"]),
        quantity: Number(pick(r, ["quantity", "qty", "count"])) || 1,
        address: pick(r, ["address", "shippingaddress", "location", "wilaya"]),
        date,
        status,
      };
    })
    .filter((o) => o.clientName || o.productName);
}

export function downloadJSON(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
