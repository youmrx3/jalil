import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Download, Loader2, Tag, Trash2, X } from "lucide-react";
import { bulkAction, type BulkEntity } from "@/lib/zoric/data.functions";

/* --------------------------------- selection --------------------------------- */

export function useSelection(ids: string[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const visible = useMemo(() => new Set(ids), [ids]);
  const list = useMemo(() => selected.filter((id) => visible.has(id)), [selected, visible]);

  const toggle = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);
  const clear = useCallback(() => setSelected([]), []);
  const toggleAll = useCallback(() => {
    setSelected((s) => (ids.every((i) => s.includes(i)) && ids.length > 0 ? s.filter((i) => !visible.has(i)) : Array.from(new Set([...s, ...ids]))));
  }, [ids, visible]);

  const allSelected = ids.length > 0 && ids.every((i) => list.includes(i));
  return { selected: list, isSelected: (id: string) => list.includes(id), toggle, toggleAll, clear, allSelected, count: list.length };
}

export type Selection = ReturnType<typeof useSelection>;

export function SelectAllHead({ selection }: { selection: Selection }) {
  return (
    <TableHead className="w-10">
      <Checkbox checked={selection.allSelected} onCheckedChange={() => selection.toggleAll()} aria-label="Tout sélectionner" />
    </TableHead>
  );
}

export function SelectCell({ selection, id }: { selection: Selection; id: string }) {
  return (
    <TableCell className="w-10">
      <Checkbox checked={selection.isSelected(id)} onCheckedChange={() => selection.toggle(id)} aria-label="Sélectionner la ligne" />
    </TableCell>
  );
}

/* --------------------------------- csv export -------------------------------- */

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------- bulk bar --------------------------------- */

export type MarkOption = { field: string; value: string; label: string };

export function BulkBar({
  selection, entity, rows, queryKeys, markOptions, markLabel = "Marquer comme", allowDuplicate = true, exportName,
}: {
  selection: Selection;
  entity: BulkEntity;
  rows: Record<string, unknown>[];
  queryKeys: string[];
  markOptions?: MarkOption[];
  markLabel?: string;
  allowDuplicate?: boolean;
  exportName: string;
}) {
  const qc = useQueryClient();
  const run = useServerFn(bulkAction);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () => {
    [...queryKeys, "zoric-overview", "zoric-stock", "zoric-reports"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }));
  };

  const mut = useMutation({
    mutationFn: (v: { action: "delete" | "update" | "duplicate"; values?: Record<string, unknown> }) =>
      run({ data: { entity, ids: selection.selected, action: v.action, values: v.values } }),
    onSuccess: (r, v) => {
      invalidate();
      selection.clear();
      toast.success(
        v.action === "delete" ? `${r.affected} élément(s) supprimé(s)`
          : v.action === "duplicate" ? `${r.affected} copie(s) créée(s)`
            : `${r.affected} élément(s) mis à jour`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (selection.count === 0) return null;

  const selectedRows = rows.filter((r) => selection.selected.includes(String(r["id"])));

  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto mb-2 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-lg">
        <span className="px-2 text-sm font-semibold text-foreground">{selection.count} sélectionné(s)</span>
        {mut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {markOptions && markOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full" disabled={mut.isPending}>
                <Tag className="mr-1 h-4 w-4" /> {markLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {markOptions.map((o) => (
                <DropdownMenuItem key={`${o.field}-${o.value}`} onClick={() => mut.mutate({ action: "update", values: { [o.field]: o.value } })}>
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {allowDuplicate && (
          <Button variant="outline" size="sm" className="rounded-full" disabled={mut.isPending} onClick={() => mut.mutate({ action: "duplicate" })}>
            <Copy className="mr-1 h-4 w-4" /> Dupliquer
          </Button>
        )}

        <Button variant="outline" size="sm" className="rounded-full" onClick={() => exportCsv(exportName, selectedRows)}>
          <Download className="mr-1 h-4 w-4" /> Exporter
        </Button>

        <Button size="sm" className="rounded-full bg-[#DC2626] hover:bg-red-700" disabled={mut.isPending} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="mr-1 h-4 w-4" /> Supprimer
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full" onClick={selection.clear} aria-label="Désélectionner">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selection.count} élément(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Le stock et les données liées sont mis à jour automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-[#DC2626] hover:bg-red-700" onClick={() => mut.mutate({ action: "delete" })}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
