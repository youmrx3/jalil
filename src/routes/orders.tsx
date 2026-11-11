import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Upload, Trash2, Search, Download, Plus, ShoppingBag, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApp, type Order, type OrderStatus } from "@/lib/store";
import { fmtDate, fmtNum } from "@/lib/format";
import { exportToExcel, importOrdersFile } from "@/lib/io";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Nexus Business" },
      { name: "description", content: "Import, manage, and track orders with live stock deduction." },
    ],
  }),
  component: OrdersPage,
});

const STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Returned",
  "Cancelled",
];

const statusVariant: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "outline",
  Confirmed: "secondary",
  Shipped: "secondary",
  Delivered: "default",
  Returned: "destructive",
  Cancelled: "outline",
};

function OrdersPage() {
  const orders = useApp((s) => s.orders);
  const products = useApp((s) => s.products);
  const addOrders = useApp((s) => s.addOrders);
  const addOrder = useApp((s) => s.addOrder);
  const updateOrder = useApp((s) => s.updateOrder);
  const deleteOrder = useApp((s) => s.deleteOrder);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<Omit<Order, "id">>({
    orderId: "",
    clientName: "",
    phone: "",
    productName: "",
    quantity: 1,
    address: "",
    date: new Date().toISOString(),
    status: "Pending",
  });

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (product !== "all" && o.productName !== product) return false;
      if (
        q &&
        !`${o.clientName} ${o.phone} ${o.orderId} ${o.productName}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      if (dateFrom && new Date(o.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.date) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, q, status, product, dateFrom, dateTo]);

  const onFile = async (f: File) => {
    try {
      const list = await importOrdersFile(f);
      const linked = list.map((o) => {
        const match = products.find(
          (p) => p.name.toLowerCase() === o.productName.toLowerCase() || p.sku === o.productName,
        );
        return { ...o, productId: match?.id, productName: match?.name ?? o.productName };
      });
      addOrders(linked);
      toast.success(`Imported ${linked.length} orders — stock updated live`);
    } catch (e) {
      toast.error("Import failed");
      console.error(e);
    }
  };

  const selectedProduct = products.find(
    (p) => p.name === newOrder.productName || p.sku === newOrder.productName,
  );
  const stockShortfall =
    selectedProduct && newOrder.quantity > selectedProduct.stock
      ? newOrder.quantity - selectedProduct.stock
      : 0;

  const submitNew = () => {
    if (!newOrder.clientName || !newOrder.productName)
      return toast.error("Client and product are required");
    const match = products.find(
      (p) => p.name.toLowerCase() === newOrder.productName.toLowerCase() || p.sku === newOrder.productName,
    );
    addOrder({
      ...newOrder,
      productId: match?.id,
      orderId: newOrder.orderId || `ORD-${Date.now()}`,
    });
    toast.success(
      match && newOrder.status !== "Returned" && newOrder.status !== "Cancelled"
        ? `Order added — ${newOrder.quantity} deducted from ${match.name} stock`
        : "Order added",
    );
    setNewOpen(false);
    setNewOrder({
      orderId: "",
      clientName: "",
      phone: "",
      productName: "",
      quantity: 1,
      address: "",
      date: new Date().toISOString(),
      status: "Pending",
    });
  };

  const uniqueProducts = Array.from(new Set(orders.map((o) => o.productName))).filter(Boolean);

  return (
    <AppLayout title="Orders">
      {/* Filters */}
      <Card className="mb-3">
        <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search client, phone, order id, product…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {uniqueProducts.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <div className="flex gap-2 flex-1">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() =>
              exportToExcel("orders", {
                Orders: filtered.map((o) => ({
                  OrderID: o.orderId,
                  Date: fmtDate(o.date),
                  Client: o.clientName,
                  Phone: o.phone,
                  Product: o.productName,
                  Qty: o.quantity,
                  Address: o.address,
                  Status: o.status,
                })),
              })
            }
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none"><Plus className="h-4 w-4 mr-1" /> Add Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div><Label>Order ID</Label><Input placeholder="Auto if empty" value={newOrder.orderId} onChange={(e) => setNewOrder({ ...newOrder, orderId: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={newOrder.date.slice(0,10)} onChange={(e) => setNewOrder({ ...newOrder, date: new Date(e.target.value).toISOString() })} /></div>
                <div><Label>Client Name *</Label><Input value={newOrder.clientName} onChange={(e) => setNewOrder({ ...newOrder, clientName: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={newOrder.phone} onChange={(e) => setNewOrder({ ...newOrder, phone: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Product *</Label>
                  <Select value={newOrder.productName} onValueChange={(v) => setNewOrder({ ...newOrder, productName: v })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} <span className="text-muted-foreground">({p.stock} in stock)</span>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" min={1} value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: +e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={newOrder.status} onValueChange={(v) => setNewOrder({ ...newOrder, status: v as OrderStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2"><Label>Address</Label><Input value={newOrder.address} onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })} /></div>
                {selectedProduct && (
                  <div className={`sm:col-span-2 flex items-start gap-2 rounded-md p-2 text-xs ${stockShortfall > 0 ? "bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200" : "bg-muted/50 text-muted-foreground"}`}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      Current stock: <b>{selectedProduct.stock}</b>.{" "}
                      {stockShortfall > 0
                        ? `You're short ${stockShortfall} piece(s). The order will still save and stock will go to 0.`
                        : `After this order, ${selectedProduct.stock - newOrder.quantity} will remain.`}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                <Button onClick={submitNew}>Add Order</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-sm text-muted-foreground sm:ml-auto">
          {fmtNum(filtered.length)} of {fmtNum(orders.length)} orders
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">Import a CSV/Excel or click "Add Order".</p>
          </CardContent>
        </Card>
      )}

      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {filtered.map((o) => (
          <Card key={o.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{o.clientName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{o.orderId} · {fmtDate(o.date)}</p>
                </div>
                <Badge variant={statusVariant[o.status]} className="shrink-0 text-[10px]">
                  {o.status}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium">{o.quantity}×</span> {o.productName}
              </div>
              <div className="text-xs text-muted-foreground truncate">{o.phone} · {o.address}</div>
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value={o.status}
                  onValueChange={(v) => updateOrder(o.id, { status: v as OrderStatus })}
                >
                  <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    deleteOrder(o.id);
                    toast.success("Deleted — stock restored");
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      {filtered.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderId}</TableCell>
                    <TableCell className="text-xs">{fmtDate(o.date)}</TableCell>
                    <TableCell>{o.clientName}</TableCell>
                    <TableCell className="font-mono text-xs">{o.phone}</TableCell>
                    <TableCell>{o.productName}</TableCell>
                    <TableCell className="text-right">{o.quantity}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => updateOrder(o.id, { status: v as OrderStatus })}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <Badge variant={statusVariant[o.status]} className="text-[10px]">{o.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          deleteOrder(o.id);
                          toast.success("Deleted — stock restored");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Stock is deducted automatically when you add an order and restored when you delete it or set the status to Returned / Cancelled.
      </p>
    </AppLayout>
  );
}
