import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Inbox } from "lucide-react";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  step?: string;
  half?: boolean;
  help?: string;
};

export type FormValues = Record<string, string | number | null>;

export function EntityDialog({
  open, onOpenChange, title, description, fields, values, onSubmit, submitting, extra,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  values: FormValues;
  onSubmit: (v: FormValues) => void;
  submitting?: boolean;
  extra?: (v: FormValues, set: (n: string, val: string | number | null) => void) => ReactNode;
}) {
  const [form, setForm] = useState<FormValues>(values);
  useEffect(() => { if (open) setForm(values); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (n: string, v: string | number | null) => setForm((f) => ({ ...f, [n]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {fields.map((f) => (
            <div key={f.name} className={f.half === false || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  className="mt-1"
                  value={String(form[f.name] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : f.type === "select" ? (
                <Select value={String(form[f.name] ?? "")} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={f.placeholder ?? "Sélectionner"} /></SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1"
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  step={f.type === "number" ? (f.step ?? "0.01") : undefined}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={String(form[f.name] ?? "")}
                  onChange={(e) => set(f.name, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                />
              )}
              {f.help && <p className="text-[11px] text-muted-foreground mt-1">{f.help}</p>}
            </div>
          ))}
          {extra?.(form, set)}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-ember-deep">
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Toolbar({
  search, onSearch, onAdd, addLabel, children, placeholder = "Rechercher…",
}: {
  search: string;
  onSearch: (v: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  children?: ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1 min-w-0">
        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="pl-9 bg-card border-border rounded-2xl" />
      </div>
      {children}
      {onAdd && (
        <Button onClick={onAdd} className="bg-primary hover:bg-ember-deep shrink-0 rounded-full h-10 px-4">
          <Plus className="h-4 w-4 mr-1" /> {addLabel ?? "Ajouter"}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Card className="p-10 rounded-2xl border-border border-dashed text-center shadow-none">
      <Inbox className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold text-foreground">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function ConfirmDelete({
  open, onOpenChange, onConfirm, label = "Cet élément sera supprimé définitivement.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  label?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>{label}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction className="bg-[#DC2626] hover:bg-red-700" onClick={onConfirm}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
