import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nexus Business" },
      { name: "description", content: "Configure company details, payment info, currency, taxes." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const resetAll = useApp((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogo = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ logoDataUrl: reader.result as string });
      toast.success("Logo updated");
    };
    reader.readAsDataURL(f);
  };

  return (
    <AppLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
          <CardHeader><CardTitle className="text-sm">Company Identity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Company Name</Label><Input value={settings.companyName} onChange={(e) => updateSettings({ companyName: e.target.value })} /></div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {settings.logoDataUrl && <img src={settings.logoDataUrl} alt="Logo" className="h-14 w-14 rounded border" />}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Upload</Button>
                {settings.logoDataUrl && (
                  <Button variant="ghost" onClick={() => updateSettings({ logoDataUrl: undefined })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div><Label>Address</Label><Input value={settings.companyAddress ?? ""} onChange={(e) => updateSettings({ companyAddress: e.target.value })} placeholder="Street, City, Algeria" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={settings.companyPhone ?? ""} onChange={(e) => updateSettings({ companyPhone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={settings.companyEmail ?? ""} onChange={(e) => updateSettings({ companyEmail: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
          <CardHeader>
            <CardTitle className="text-sm">Legal & Payment Details</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Saved once — automatically inserted on every invoice / facture until you change them.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><Label>RC</Label><Input value={settings.companyRC ?? ""} onChange={(e) => updateSettings({ companyRC: e.target.value })} placeholder="Registre commerce" /></div>
              <div><Label>NIF</Label><Input value={settings.companyNIF ?? ""} onChange={(e) => updateSettings({ companyNIF: e.target.value })} /></div>
              <div><Label>AI</Label><Input value={settings.companyAI ?? ""} onChange={(e) => updateSettings({ companyAI: e.target.value })} placeholder="Article imposition" /></div>
            </div>
            <div>
              <Label>Bank / RIB / Payment Instructions</Label>
              <Textarea
                rows={4}
                value={settings.companyBank ?? ""}
                onChange={(e) => updateSettings({ companyBank: e.target.value })}
                placeholder={"e.g.\nBank: BNA\nRIB: 001 00123 4567890123 45\nCCP: 12345-67 clé 89\nBaridiMob: 007999XXXXXXXXXX"}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Multi-line — appears on every facture PDF.</p>
            </div>
            <div><Label>Invoice Footer</Label><Textarea rows={2} value={settings.invoiceFooter} onChange={(e) => updateSettings({ invoiceFooter: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
          <CardHeader><CardTitle className="text-sm">Financial Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>USD → DZD Exchange Rate</Label>
              <Input type="number" step="0.01" min="0" value={settings.fxRate} onChange={(e) => updateSettings({ fxRate: +e.target.value })} />
              <p className="text-[10px] text-muted-foreground mt-1">Decimals supported (e.g. 252.25). Applies everywhere USD → DZD.</p>
            </div>
            <div><Label>Default Return Cost (DZD)</Label><Input type="number" step="0.01" value={settings.defaultReturnCost} onChange={(e) => updateSettings({ defaultReturnCost: +e.target.value })} /></div>
            <div><Label>Default Profit Margin (%)</Label><Input type="number" step="0.01" value={settings.defaultMargin} onChange={(e) => updateSettings({ defaultMargin: +e.target.value })} /></div>
            <div><Label>Tax / TVA (%)</Label><Input type="number" step="0.01" value={settings.taxPercent} onChange={(e) => updateSettings({ taxPercent: +e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
          <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Theme</Label>
              <Select value={settings.theme} onValueChange={(v) => updateSettings({ theme: v as "light" | "dark" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as "en" | "fr" | "ar" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">UI translation coming soon.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40 lg:col-span-2">
          <CardHeader><CardTitle className="text-sm text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Erase all data and reset settings. Cannot be undone.</p>
            <Button variant="destructive" onClick={() => { if (confirm("Delete ALL data?")) { resetAll(); toast.success("All data cleared"); } }}>Reset everything</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
