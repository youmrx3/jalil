import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Sparkles, Info, RotateCw, Play } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NumericInput } from "@/components/numeric-input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculators")({
  head: () => ({
    meta: [
      { title: "Ad Calculators — Nexus Business" },
      { name: "description", content: "Arabic ad & product profitability calculators for e-commerce campaigns." },
    ],
  }),
  component: CalculatorsPage,
});

/* ============================================================================ */
/*  Shared UI                                                                    */
/* ============================================================================ */

function AppBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-600/90 text-white text-xs font-semibold px-3 py-1 shadow">
      <Sparkles className="h-3 w-3" /> App Calculator
    </span>
  );
}

function Panel({
  title, dot = "orange", children, className,
}: {
  title: string; dot?: "orange" | "blue"; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 p-4 sm:p-5",
        "bg-gradient-to-b from-slate-900/80 to-slate-950/80 shadow-inner",
        className,
      )}
    >
      <div className="flex items-center gap-2 justify-end mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            dot === "orange" ? "bg-orange-500" : "bg-sky-400",
          )}
        />
      </div>
      {children}
    </div>
  );
}

function Field({
  label, hint, children, dir = "rtl",
}: { label: string; hint?: string; children: React.ReactNode; dir?: "rtl" | "ltr" }) {
  return (
    <div className="space-y-1.5" dir={dir}>
      <div className="flex items-center gap-1 justify-end">
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-white text-[10px] cursor-help">
                  <Info className="h-2.5 w-2.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Label className="text-sm font-medium text-white/80">{label}</Label>
      </div>
      {children}
    </div>
  );
}

function NumInput(props: React.ComponentProps<typeof NumericInput>) {
  return (
    <NumericInput
      {...props}
      className={cn(
        "text-right bg-white text-slate-900 border-white/10 rounded-xl h-11 font-semibold shadow-sm",
        props.className,
      )}
    />
  );
}

function ResultTile({
  label, value, tone = "default", big = false, className,
}: {
  label: string; value: string; tone?: "default" | "warn" | "good" | "danger" | "hero";
  big?: boolean; className?: string;
}) {
  const toneMap = {
    default: "bg-slate-800/60 border-white/5 text-white",
    warn: "bg-amber-950/40 border-amber-500/40 text-amber-200",
    good: "bg-emerald-950/40 border-emerald-500/40 text-emerald-200",
    danger: "bg-rose-950/40 border-rose-500/40 text-rose-200",
    hero: "bg-gradient-to-br from-amber-900/70 to-amber-950/70 border-amber-500/50 text-amber-100",
  };
  return (
    <div
      dir="rtl"
      className={cn(
        "rounded-xl border p-3 flex flex-col justify-between text-right",
        toneMap[tone],
        big ? "min-h-[92px]" : "min-h-[72px]",
        className,
      )}
    >
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className={cn("font-bold leading-tight mt-1", big ? "text-lg" : "text-base")}>{value}</div>
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/50 p-3" dir="rtl">
      <div className="flex justify-between items-center mb-2 text-xs">
        <span className="text-white/60">{pct.toFixed(0)}%</span>
        <span className="text-white font-medium">{label}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AdviceBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 to-slate-950/40 p-3 text-right"
    >
      <div className="text-sm font-bold text-white mb-1">نصيحة ذكية</div>
      <div className="text-xs text-white/70 leading-relaxed">{children}</div>
    </div>
  );
}

function DecisionTile({ text, tone }: { text: string; tone: "wait" | "good" | "bad" }) {
  const toneMap = {
    wait: "from-amber-900/70 to-amber-950/70 border-amber-500/50 text-amber-100",
    good: "from-emerald-900/70 to-emerald-950/70 border-emerald-500/50 text-emerald-100",
    bad: "from-rose-900/70 to-rose-950/70 border-rose-500/50 text-rose-100",
  };
  return (
    <div
      dir="rtl"
      className={cn(
        "rounded-xl border p-3 bg-gradient-to-br text-right min-h-[92px] flex flex-col justify-between",
        toneMap[tone],
      )}
    >
      <div className="text-xs font-medium opacity-80">قرار المنتج</div>
      <div className="text-lg font-extrabold leading-tight mt-1">{text}</div>
    </div>
  );
}

function ActionRow({ onRun, onReset, runLabel = "اختبر المنتج الآن" }: {
  onRun: () => void; onReset: () => void; runLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-2" dir="rtl">
      <Button
        onClick={onRun}
        className="h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg"
      >
        <Play className="h-4 w-4 ml-1" /> {runLabel}
      </Button>
      <Button
        onClick={onReset}
        variant="secondary"
        className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-white/5"
      >
        <RotateCw className="h-4 w-4 ml-1" /> إعادة التصفير
      </Button>
    </div>
  );
}

const dz = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

/* ============================================================================ */
/*  1) اختبر المنتج قبل إطلاق الإعلان                                            */
/* ============================================================================ */

function ProductTester() {
  const [sell, setSell] = useState(5000);
  const [buy, setBuy] = useState(2000);
  const [otherCost, setOtherCost] = useState(1000);
  const [adCost, setAdCost] = useState(200);
  const [target, setTarget] = useState(30);
  const [cod, setCod] = useState(2);
  const [ran, setRan] = useState(false);

  const reset = () => {
    setSell(0); setBuy(0); setOtherCost(0); setAdCost(0); setTarget(0); setCod(0); setRan(false);
  };

  const r = useMemo(() => {
    const codFee = (sell * cod) / 100;
    const totalCost = buy + otherCost + adCost + codFee;
    const net = sell - totalCost;
    const margin = sell > 0 ? (net / sell) * 100 : 0;
    const breakeven = totalCost;
    const requiredPrice = totalCost / (1 - target / 100 - cod / 100);
    let decision: { text: string; tone: "wait" | "good" | "bad" } = { text: "بانتظار الإدخال", tone: "wait" };
    if (ran) {
      if (margin >= target) decision = { text: "منتج مربح ✓", tone: "good" };
      else if (margin > 0) decision = { text: "هامش ضعيف", tone: "wait" };
      else decision = { text: "خاسر ✗", tone: "bad" };
    }
    return { net, margin, breakeven, requiredPrice, decision };
  }, [sell, buy, otherCost, adCost, target, cod, ran]);

  return (
    <Card className="border-white/5 bg-slate-950/60 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5" dir="rtl">
          <AppBadge />
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">اختبر المنتج قبل إطلاق الإعلان</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
              أدخل سعر البيع والشراء والتكاليف الأساسية لتعرف هل المنتج يحقق الهامش الذي تريده، وما هو السعر المطلوب للوصول إلى هدفك.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inputs */}
          <Panel title="المعطيات" dot="orange">
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر بيع المنتج (دج)">
                <NumInput value={sell} onValueChange={setSell} />
              </Field>
              <Field label="سعر شراء المنتج (دج)">
                <NumInput value={buy} onValueChange={setBuy} />
              </Field>
              <Field label="إجمالي التكاليف الأخرى للوحدة" hint="تشمل التغليف، التوصيل، تكلفة التأكيد…">
                <NumInput value={otherCost} onValueChange={setOtherCost} />
              </Field>
              <Field label="تكلفة الإعلان لكل طلبية مسلمة" hint="مصروف الإعلان مقسّم على عدد الطلبيات المسلمة">
                <NumInput value={adCost} onValueChange={setAdCost} />
              </Field>
              <Field label="الهامش المستهدف (%)" hint="نسبة الربح التي تريدها من سعر البيع">
                <NumInput value={target} onValueChange={setTarget} />
              </Field>
              <Field label="نسبة COD (%)" hint="نسبة العمولة التي تأخذها شركة التوصيل من سعر البيع">
                <NumInput value={cod} onValueChange={setCod} />
              </Field>
            </div>
            <ActionRow onRun={() => setRan(true)} onReset={reset} />
            <p className="mt-3 text-[11px] text-white/40 text-right leading-relaxed" dir="rtl">
              استعمل هذه الحاسبة عندما تريد معرفة هل سعر المنتج يغطي تكاليفك ويحقق الهامش الذي تستهدفه قبل صرف ميزانية أكبر على الإعلان.
            </p>
          </Panel>

          {/* Results */}
          <Panel title="القرار السريع" dot="orange">
            <div className="grid grid-cols-3 gap-2">
              <DecisionTile text={r.decision.text} tone={r.decision.tone} />
              <ResultTile label="الربح الصافي للوحدة" value={`${dz(r.net)} دج`} tone="hero" big />
              <ResultTile
                label="هامش الربح الحالي"
                value={`${dz(r.margin)}%`}
                tone={r.margin >= target ? "good" : r.margin > 0 ? "warn" : "danger"}
                big
              />
            </div>

            <div className="mt-3">
              <Progress value={r.margin} label="قوة النتيجة" />
            </div>

            <div className="mt-3">
              <AdviceBox>
                {ran
                  ? r.decision.tone === "good"
                    ? "منتجك يحقق الهامش المطلوب. يمكنك المضي في إطلاق الإعلان مع مراقبة تكلفة الطلبية المسلمة."
                    : "الهامش أقل من هدفك. جرّب رفع سعر البيع أو خفض التكاليف الأخرى قبل الإعلان."
                  : "أدخل سعر البيع وباقي الأرقام لتحصل على قرار واضح قبل تجربة المنتج."}
              </AdviceBox>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <ResultTile label="السعر الحالي" value={`${dz(sell)} دج`} />
              <ResultTile label="سعر التعادل" value={`${dz(r.breakeven)} دج`} tone="warn" />
              <ResultTile label="السعر المطلوب" value={`${dz(r.requiredPrice)} دج`} tone="good" />
            </div>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================ */
/*  2) احسب المنتج قبل إطلاق الإعلان (Full)                                      */
/* ============================================================================ */

function ProductFull() {
  const [sell, setSell] = useState(6000);
  const [buy, setBuy] = useState(2000);
  const [confirmRate, setConfirmRate] = useState(70);
  const [deliverRate, setDeliverRate] = useState(50);
  const [callCost, setCallCost] = useState(120);
  const [rotorCost, setRotorCost] = useState(250);
  const [deliveryCost, setDeliveryCost] = useState(700);
  const [payer, setPayer] = useState<"me" | "client">("me");
  const [clientShare, setClientShare] = useState(300);
  const [codPct, setCodPct] = useState(2);
  const [extra, setExtra] = useState(100);
  const [adCurrency, setAdCurrency] = useState<"DZD" | "EUR" | "USD">("DZD");
  const [adSpend, setAdSpend] = useState(100);
  const [eur, setEur] = useState(245);
  const [usd, setUsd] = useState(240);
  const [totalOrders, setTotalOrders] = useState(100);
  const [ran, setRan] = useState(false);

  const reset = () => {
    setSell(0); setBuy(0); setConfirmRate(0); setDeliverRate(0); setCallCost(0);
    setRotorCost(0); setDeliveryCost(0); setClientShare(0); setCodPct(0); setExtra(0);
    setAdSpend(0); setTotalOrders(0); setRan(false);
  };

  const r = useMemo(() => {
    const confirmed = totalOrders * (confirmRate / 100);
    const delivered = confirmed * (deliverRate / 100);
    const adInDzd = adCurrency === "EUR" ? adSpend * eur : adCurrency === "USD" ? adSpend * usd : adSpend;
    const adPerDelivered = delivered > 0 ? adInDzd / delivered : 0;
    const netDelivery = payer === "me" ? Math.max(0, deliveryCost - clientShare) : 0;
    const codFee = (sell * codPct) / 100;
    const unitCost = buy + callCost + rotorCost + netDelivery + extra + codFee + adPerDelivered;
    const net = sell - unitCost;
    const margin = sell > 0 ? (net / sell) * 100 : 0;
    const breakeven = unitCost;
    const suggested = unitCost / (1 - 0.3);
    let decision: { text: string; tone: "wait" | "good" | "bad" } = { text: "بانتظار الإدخال", tone: "wait" };
    if (ran) {
      if (margin >= 25) decision = { text: "منتج مربح ✓", tone: "good" };
      else if (margin > 0) decision = { text: "هامش ضعيف", tone: "wait" };
      else decision = { text: "خاسر ✗", tone: "bad" };
    }
    return { confirmed, delivered, adPerDelivered, unitCost, net, margin, breakeven, suggested, decision };
  }, [sell, buy, confirmRate, deliverRate, callCost, rotorCost, deliveryCost, payer, clientShare, codPct, extra, adCurrency, adSpend, eur, usd, totalOrders, ran]);

  return (
    <Card className="border-white/5 bg-slate-950/60 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5" dir="rtl">
          <AppBadge />
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">احسب المنتج قبل إطلاق الإعلان</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
              أدخل سعر الشراء، سعر البيع، التأكيد، التسليم، مصاريف الإعلان والتوصيل، ثم راقب القرار السريع والتفاصيل الكاملة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="المعطيات" dot="orange">
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر بيع المنتج (دج)"><NumInput value={sell} onValueChange={setSell} /></Field>
              <Field label="سعر شراء المنتج (دج)"><NumInput value={buy} onValueChange={setBuy} /></Field>
              <Field label="نسبة التأكيد (%)" hint="نسبة الطلبات التي يتم تأكيدها"><NumInput value={confirmRate} onValueChange={setConfirmRate} /></Field>
              <Field label="نسبة التسليم (%)" hint="نسبة الطلبات المؤكدة التي وصلت للزبون"><NumInput value={deliverRate} onValueChange={setDeliverRate} /></Field>
              <Field label="تكلفة التأكيد / Call Center"><NumInput value={callCost} onValueChange={setCallCost} /></Field>
              <Field label="تكلفة الروتور"><NumInput value={rotorCost} onValueChange={setRotorCost} /></Field>
              <Field label="تكلفة التوصيل الكاملة"><NumInput value={deliveryCost} onValueChange={setDeliveryCost} /></Field>
              <Field label="من يدفع التوصيل؟">
                <Select value={payer} onValueChange={(v) => setPayer(v as "me" | "client")}>
                  <SelectTrigger className="h-11 bg-white text-slate-900 rounded-xl text-right font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">أنت تدفع</SelectItem>
                    <SelectItem value="client">الزبون يدفع</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="مساهمة الزبون في التوصيل (دج)">
                <NumInput value={clientShare} onValueChange={setClientShare} />
              </Field>
              <Field label="نسبة COD التي تأخذها شركة التوصيل (%)" hint="عمولة شركة التوصيل من سعر البيع">
                <NumInput value={codPct} onValueChange={setCodPct} />
              </Field>
              <Field label="مصاريف إضافية"><NumInput value={extra} onValueChange={setExtra} /></Field>
              <Field label="عملة الإعلان">
                <Select value={adCurrency} onValueChange={(v) => setAdCurrency(v as "DZD" | "EUR" | "USD")}>
                  <SelectTrigger className="h-11 bg-white text-slate-900 rounded-xl text-right font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DZD">DZD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="إجمالي مصروف الإعلانات" hint="بنفس العملة أعلاه"><NumInput value={adSpend} onValueChange={setAdSpend} /></Field>
              <Field label="سعر الأورو في السوق السوداء"><NumInput value={eur} onValueChange={setEur} /></Field>
              <Field label="سعر الدولار / USDT"><NumInput value={usd} onValueChange={setUsd} /></Field>
              <Field label="عدد الطلبيات الكلي"><NumInput value={totalOrders} onValueChange={setTotalOrders} /></Field>
            </div>
            <ActionRow onRun={() => setRan(true)} onReset={reset} runLabel="تحليل المنتج الآن" />
          </Panel>

          <Panel title="القرار السريع" dot="orange">
            <div className="grid grid-cols-3 gap-2">
              <DecisionTile text={r.decision.text} tone={r.decision.tone} />
              <ResultTile label="الربح الصافي للوحدة" value={`${dz(r.net)} دج`} tone="hero" big />
              <ResultTile label="هامش الربح" value={`${dz(r.margin)}%`} tone={r.margin >= 25 ? "good" : r.margin > 0 ? "warn" : "danger"} big />
            </div>

            <div className="mt-3"><Progress value={r.margin} label="قوة الهامش" /></div>

            <div className="mt-3">
              <AdviceBox>
                {ran
                  ? r.decision.tone === "good"
                    ? "المنتج يحقق هامشاً جيداً بعد كل التكاليف. أطلق الإعلان وراقب تكلفة الطلبية المسلمة."
                    : "التكلفة الإجمالية مرتفعة قياساً بسعر البيع. راجع تكلفة التوصيل والإعلان قبل الإطلاق."
                  : "أدخل سعر البيع والتكاليف الأساسية لتحصل على قرار واضح قبل إطلاق المنتج."}
              </AdviceBox>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <ResultTile label="السعر الحالي" value={`${dz(sell)} دج`} />
              <ResultTile label="سعر التعادل" value={`${dz(r.breakeven)} دج`} tone="warn" />
              <ResultTile label="السعر المقترح" value={`${dz(r.suggested)} دج`} tone="good" />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <ResultTile label="طلبيات مؤكدة" value={dz(r.confirmed)} />
              <ResultTile label="طلبيات مسلمة" value={dz(r.delivered)} />
              <ResultTile label="Cost لكل مسلمة" value={`${dz(r.adPerDelivered)} دج`} tone="warn" />
            </div>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================ */
/*  3) احسب ربحية الحملة قبل التوسع                                              */
/* ============================================================================ */

function CampaignProfitability() {
  const [budget, setBudget] = useState(10000);
  const [orders, setOrders] = useState(20);
  const [confirmRate, setConfirmRate] = useState(70);
  const [deliverRate, setDeliverRate] = useState(60);
  const [profitPerUnit, setProfitPerUnit] = useState(1200);
  const [ran, setRan] = useState(false);

  const reset = () => {
    setBudget(0); setOrders(0); setConfirmRate(0); setDeliverRate(0); setProfitPerUnit(0); setRan(false);
  };

  const r = useMemo(() => {
    const confirmed = orders * (confirmRate / 100);
    const delivered = confirmed * (deliverRate / 100);
    const costPerOrder = orders > 0 ? budget / orders : 0;
    const costPerDelivered = delivered > 0 ? budget / delivered : 0;
    const grossBefore = profitPerUnit * delivered;
    const netAfter = grossBefore - budget;
    const roi = budget > 0 ? (netAfter / budget) * 100 : 0;
    const perOrderRemain = delivered > 0 ? netAfter / delivered : 0;
    let decision: { text: string; tone: "wait" | "good" | "bad" } = { text: "بانتظار الإدخال", tone: "wait" };
    if (ran) {
      if (roi >= 30) decision = { text: "حملة مربحة ✓ وسّع", tone: "good" };
      else if (roi > 0) decision = { text: "مربحة بخفة", tone: "wait" };
      else decision = { text: "حملة خاسرة ✗", tone: "bad" };
    }
    return { confirmed, delivered, costPerOrder, costPerDelivered, grossBefore, netAfter, roi, perOrderRemain, decision };
  }, [budget, orders, confirmRate, deliverRate, profitPerUnit, ran]);

  return (
    <Card className="border-white/5 bg-slate-950/60 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5" dir="rtl">
          <AppBadge />
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">احسب ربحية الحملة قبل التوسع</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
              أدخل ميزانية الإعلان، عدد الطلبيات، نسب التأكيد والتسليم، وربحك قبل الإعلان. بعدها راقب القرار السريع والتفاصيل الكاملة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Results (left on desktop, mirrored to match reference) */}
          <Panel title="القرار السريع" dot="orange">
            <div className="grid grid-cols-3 gap-2">
              <DecisionTile text={r.decision.text} tone={r.decision.tone} />
              <ResultTile label="صافي الربح بعد الإعلان" value={`${dz(r.netAfter)} دج`} tone="hero" big />
              <ResultTile label="عدد الطلبيات المسلمة" value={dz(r.delivered)} big />
            </div>

            <div className="mt-3"><Progress value={r.roi} label="قوة النتيجة" /></div>

            <div className="mt-3">
              <AdviceBox>
                {ran
                  ? r.decision.tone === "good"
                    ? "الحملة تحقق عائداً جيداً على الميزانية. جرّب رفع الميزانية تدريجياً مع مراقبة الـ Cost."
                    : "العائد على الميزانية ضعيف. راجع نسبة التسليم أو خفّض Cost الطلبية قبل التوسع."
                  : "أدخل الميزانية وعدد الطلبيات وربحك من المنتج لتحصل على قرار واضح قبل التوسع."}
              </AdviceBox>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <ResultTile label="عدد الطلبيات المؤكدة" value={dz(r.confirmed)} />
              <ResultTile label="تكلفة الطلبية" value={`${dz(r.costPerOrder)} دج`} tone="warn" />
              <ResultTile label="تكلفة الطلبية المسلمة" value={`${dz(r.costPerDelivered)} دج`} tone="warn" />
              <ResultTile label="العائد الصافي على الميزانية" value={`${dz(r.roi)}%`} tone={r.roi > 0 ? "good" : "danger"} />
              <ResultTile label="الربح الإجمالي قبل الإعلان" value={`${dz(r.grossBefore)} دج`} />
              <ResultTile label="الربح المتبقي لكل طلبية" value={`${dz(r.perOrderRemain)} دج`} tone="hero" />
            </div>
          </Panel>

          <Panel title="المعطيات" dot="orange">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ميزانية الإعلانات (دج)"><NumInput value={budget} onValueChange={setBudget} /></Field>
              <Field label="عدد الطلبيات التي وصلتك"><NumInput value={orders} onValueChange={setOrders} /></Field>
              <Field label="نسبة التأكيد (%)" hint="نسبة الطلبيات المؤكدة"><NumInput value={confirmRate} onValueChange={setConfirmRate} /></Field>
              <Field label="نسبة التسليم (%)" hint="نسبة الطلبيات المسلمة من المؤكدة"><NumInput value={deliverRate} onValueChange={setDeliverRate} /></Field>
              <Field label="ربحك من بيع المنتج بدون إعلانات (دج)" hint="صافي ربحك على كل وحدة قبل تكلفة الإعلان">
                <div className="col-span-2"><NumInput value={profitPerUnit} onValueChange={setProfitPerUnit} /></div>
              </Field>
            </div>
            <ActionRow onRun={() => setRan(true)} onReset={reset} runLabel="تحليل الحملة الآن" />
            <p className="mt-3 text-[11px] text-white/40 text-right leading-relaxed" dir="rtl">
              هذه الحاسبة تحسب تكلفة الإعلان على الطلبيات المسلمة لأنها أقرب رقم يوضح هل الحملة رابحة فعلاً أم لا.
            </p>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================ */
/*  4) اعرف سقف الـ Cost قبل رفع الميزانية                                       */
/* ============================================================================ */

function CostCeiling() {
  const [sell, setSell] = useState(4000);
  const [buy, setBuy] = useState(2000);
  const [delivery, setDelivery] = useState(400);
  const [confirmCost, setConfirmCost] = useState(100);
  const [packaging, setPackaging] = useState(50);
  const [other, setOther] = useState(50);
  const [adCurrency, setAdCurrency] = useState<"EUR" | "USD" | "DZD">("EUR");
  const [rate, setRate] = useState(260);
  const [adSpend, setAdSpend] = useState(50);
  const [currentCost, setCurrentCost] = useState(2);
  const [confirmRate, setConfirmRate] = useState(70);
  const [deliverRate, setDeliverRate] = useState(60);
  const [ran, setRan] = useState(false);

  const reset = () => {
    setSell(0); setBuy(0); setDelivery(0); setConfirmCost(0); setPackaging(0); setOther(0);
    setRate(0); setAdSpend(0); setCurrentCost(0); setConfirmRate(0); setDeliverRate(0); setRan(false);
  };

  const cur = adCurrency === "DZD" ? "دج" : adCurrency === "EUR" ? "€" : "$";
  const toCur = (dzd: number) => (adCurrency === "DZD" ? dzd : rate > 0 ? dzd / rate : 0);

  const r = useMemo(() => {
    const unitCostBeforeAds = buy + delivery + confirmCost + packaging + other;
    const profitBeforeAds = sell - unitCostBeforeAds;
    const profitBeforeAdsPerConfirmed = profitBeforeAds * (deliverRate / 100);
    const maxCostDzd = Math.max(0, profitBeforeAdsPerConfirmed);
    const excellent = maxCostDzd * 0.5;
    const danger = maxCostDzd * 0.85;
    const currentInDzd = adCurrency === "DZD" ? currentCost : currentCost * rate;
    const diff = maxCostDzd - currentInDzd;
    const netAfter = (profitBeforeAdsPerConfirmed - currentInDzd);
    let decision: { text: string; tone: "wait" | "good" | "bad" } = { text: "بانتظار الإدخال", tone: "wait" };
    let scale = "—";
    if (ran) {
      if (currentInDzd <= excellent) { decision = { text: "وسّع الميزانية ✓", tone: "good" }; scale = "Scale ↑"; }
      else if (currentInDzd <= danger) { decision = { text: "استقر بالميزانية", tone: "wait" }; scale = "Hold"; }
      else { decision = { text: "خفّض Cost ✗", tone: "bad" }; scale = "Stop"; }
    }
    return {
      profitBeforeAds, maxCostDzd, excellent, danger, diff, netAfter,
      currentInDzd, decision, scale,
      unitCostBeforeAds,
      // display in ad currency
      maxCost: toCur(maxCostDzd),
      excellentCur: toCur(excellent),
      dangerCur: toCur(danger),
      diffCur: toCur(Math.abs(diff)),
      currentCur: currentCost,
      profitBeforeCur: profitBeforeAdsPerConfirmed, // stays DZD (as in reference)
      netAfterCur: netAfter,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sell, buy, delivery, confirmCost, packaging, other, adCurrency, rate, adSpend, currentCost, confirmRate, deliverRate, ran]);

  return (
    <Card className="border-white/5 bg-slate-950/60 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5" dir="rtl">
          <AppBadge />
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">اعرف سقف الـ Cost قبل رفع الميزانية</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
              أدخل سعر البيع، التكاليف، العملة، الـ Cost الحالي، ونسب التأكيد والتسليم، ثم راقب القرار السريع والتفاصيل الكاملة.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="معطيات المنتج والقمع" dot="orange">
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر بيع المنتج (دج)"><NumInput value={sell} onValueChange={setSell} /></Field>
              <Field label="سعر شراء المنتج (دج)"><NumInput value={buy} onValueChange={setBuy} /></Field>
              <Field label="تكلفة التوصيل (دج)"><NumInput value={delivery} onValueChange={setDelivery} /></Field>
              <Field label="تكلفة تأكيد الطلب (دج)"><NumInput value={confirmCost} onValueChange={setConfirmCost} /></Field>
              <Field label="تكلفة التغليف (دج)"><NumInput value={packaging} onValueChange={setPackaging} /></Field>
              <Field label="مصاريف أخرى (دج)"><NumInput value={other} onValueChange={setOther} /></Field>
              <Field label="عملة الإعلانات">
                <Select value={adCurrency} onValueChange={(v) => setAdCurrency(v as "EUR" | "USD" | "DZD")}>
                  <SelectTrigger className="h-11 bg-white text-slate-900 rounded-xl text-right font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="DZD">DZD (دج)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="سعر العملة مقابل الدينار" hint="سعر 1€ أو 1$ بالدينار"><NumInput value={rate} onValueChange={setRate} /></Field>
              <Field label="إجمالي مصروف الإعلانات" hint="بنفس العملة أعلاه"><NumInput value={adSpend} onValueChange={setAdSpend} /></Field>
              <Field label="Cost الحالي لكل طلب" hint="تكلفة الإعلان الحالية لكل طلب مؤكد"><NumInput value={currentCost} onValueChange={setCurrentCost} /></Field>
              <Field label="نسبة التأكيد (%)"><NumInput value={confirmRate} onValueChange={setConfirmRate} /></Field>
              <Field label="نسبة التسليم (%)"><NumInput value={deliverRate} onValueChange={setDeliverRate} /></Field>
            </div>
            <ActionRow onRun={() => setRan(true)} onReset={reset} runLabel="تحليل الحملة الآن" />
            <p className="mt-3 text-[11px] text-white/40 text-right leading-relaxed" dir="rtl">
              الأداة تحسب الربح قبل الإعلانات من سعر البيع والشراء والتكاليف، ثم توضّح سقف الـ Cost الحقيقي الذي يمكن أن تتحمله الحملة قبل دخول الخسارة.
            </p>
          </Panel>

          <Panel title="القرار السريع" dot="orange">
            <div className="grid grid-cols-3 gap-2">
              <DecisionTile text={r.decision.text} tone={r.decision.tone} />
              <ResultTile label="قرار الـ Scale" value={r.scale} tone="hero" big />
              <ResultTile label="صافي الربح بعد الإعلانات" value={`${dz(r.netAfterCur)} دج`} tone={r.netAfterCur > 0 ? "good" : "danger"} big />
            </div>

            <div className="mt-3"><Progress value={r.maxCostDzd > 0 ? Math.max(0, 100 - (r.currentInDzd / r.maxCostDzd) * 100) : 0} label="قوة القرار" /></div>

            <div className="mt-3">
              <AdviceBox>
                {ran
                  ? r.decision.tone === "good"
                    ? "الـ Cost الحالي أقل بكثير من السقف. توسّع بأمان مع مراقبة يومية."
                    : r.decision.tone === "wait"
                    ? "الـ Cost قريب من السقف. حافظ على الميزانية الحالية وحسّن نسبة التأكيد والتسليم."
                    : "الـ Cost فوق السقف. أوقف الرفع، حسّن الكرييتف أو الاستهداف قبل أي زيادة."
                  : "أكمل المعطيات الأساسية: سعر البيع والشراء، التكاليف، الإعلانات، Cost الحالي، ونسب التأكيد والتسليم."}
              </AdviceBox>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <ResultTile label="الربح قبل الإعلانات" value={`${dz(r.profitBeforeCur)} دج`} />
              <ResultTile label="Cost الحالي" value={`${cur} ${dz(r.currentCur)}`} tone="warn" />
              <ResultTile label="أقصى Cost مسموح" value={`${cur} ${dz(r.maxCost)}`} tone="good" />
              <ResultTile label="Cost ممتاز" value={`${cur} ${dz(r.excellentCur)}`} tone="good" />
              <ResultTile label="Cost خطر" value={`${cur} ${dz(r.dangerCur)}`} tone="danger" />
              <ResultTile
                label="الفرق عن أقصى Cost"
                value={`${cur} ${dz(r.diffCur)}`}
                tone={r.diff >= 0 ? "good" : "danger"}
              />
            </div>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================ */
/*  Page                                                                         */
/* ============================================================================ */

function CalculatorsPage() {
  return (
    <AppLayout title="Ad Calculators">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-[color:var(--electric)]" />
        <h2 className="text-xl font-bold tracking-tight">حاسبات الإعلانات والمنتج</h2>
      </div>

      <Tabs defaultValue="tester" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-slate-900/60 p-1 rounded-xl mb-4">
          <TabsTrigger value="tester" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            اختبر المنتج
          </TabsTrigger>
          <TabsTrigger value="full" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            احسب المنتج الكامل
          </TabsTrigger>
          <TabsTrigger value="campaign" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            ربحية الحملة
          </TabsTrigger>
          <TabsTrigger value="cost" className="text-xs sm:text-sm py-2 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            سقف الـ Cost
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tester"><ProductTester /></TabsContent>
        <TabsContent value="full"><ProductFull /></TabsContent>
        <TabsContent value="campaign"><CampaignProfitability /></TabsContent>
        <TabsContent value="cost"><CostCeiling /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}
