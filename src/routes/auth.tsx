import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Loader2, MailCheck } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Connexion — Zoric" },
      { name: "description", content: "Accédez à votre tableau de bord Zoric Commerce OS." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "reset" | "check-email";
const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

/** Only allow in-app relative redirects (prevents open-redirects via ?redirect=). */
function safeRedirect(r?: string) {
  if (!r) return "/zoric";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return "/zoric";
    return u.pathname + u.search + u.hash;
  } catch { return "/zoric"; }
}

function AuthPage() {
  const { redirect, mode: initialMode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const go = () => navigate({ to: safeRedirect(redirect), replace: true });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    if (window.location.hash.includes("type=recovery")) setMode("reset");
    else supabase.auth.getUser().then(({ data }) => { if (data.user && !window.location.hash.includes("type=recovery")) go(); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/zoric", data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) { toast.success("Compte créé"); go(); }
        else setMode("check-email");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        go();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth" });
        if (error) throw error;
        setMode("check-email");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Mot de passe mis à jour");
        go();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + safeRedirect(redirect) },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };

  const heading: Record<Mode, [string, string]> = {
    signin: ["Bon retour", "Connectez-vous à votre tableau de bord"],
    signup: ["Créer un compte", "Lancez votre boutique en 30 secondes"],
    forgot: ["Mot de passe oublié", "Recevez un lien de réinitialisation par e-mail"],
    reset: ["Nouveau mot de passe", "Choisissez un nouveau mot de passe"],
    "check-email": ["Vérifiez vos e-mails", ""],
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand side */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-border bg-surface">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-120px] h-[460px] w-[460px] rounded-full bg-[#d9400e]/20 blur-[120px]" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-ember-gradient flex items-center justify-center text-white"><Flame className="h-5 w-5" /></div>
          <div className="text-lg font-bold text-foreground">Zoric</div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
            Votre boutique COD,<br /><span className="gradient-text">au même endroit.</span>
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">Commandes, stocks, livraisons, publicités et finances — avec des objectifs quotidiens qui vous disent où vous en êtes.</p>
          <div className="mt-8 flex items-end gap-2 h-28">
            {[38, 62, 45, 80, 55, 92, 70, 100, 64, 86].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className={`h-2.5 w-2.5 rounded-full ${h > 60 ? "bg-primary shadow-[0_0_12px_rgba(255,90,31,0.9)]" : "bg-muted-foreground/50"}`} />
                <span className={`w-[3px] rounded-full ${h > 60 ? "bg-gradient-to-b from-primary to-primary/20" : "bg-muted-foreground/25"}`} style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[12px] text-muted-foreground">© {new Date().getFullYear()} Zoric Commerce OS</div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-ember-gradient flex items-center justify-center text-white"><Flame className="h-5 w-5" /></div>
            <div className="text-lg font-bold text-foreground">Zoric</div>
          </div>

          {mode === "check-email" ? (
            <div className="panel p-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center"><MailCheck className="h-6 w-6" /></div>
              <h1 className="mt-4 text-xl font-bold text-foreground">{heading["check-email"][0]}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Nous avons envoyé un lien à <span className="text-foreground font-medium">{email}</span>. Ouvrez-le pour continuer.</p>
              <Button variant="outline" className="mt-6 rounded-xl w-full" onClick={() => setMode("signin")}>Retour à la connexion</Button>
            </div>
          ) : (
            <>
              <h1 className="text-[28px] font-bold tracking-tight text-foreground">{heading[mode][0]}</h1>
              <p className="text-sm text-muted-foreground mt-1">{heading[mode][1]}</p>

              {GOOGLE_ENABLED && (mode === "signin" || mode === "signup") && (
                <>
                  <Button variant="outline" className="w-full mt-6 h-11 rounded-xl" onClick={google} disabled={loading}>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
                    Continuer avec Google
                  </Button>
                  <div className="relative my-5"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">ou avec e-mail</span></div></div>
                </>
              )}

              <form onSubmit={submit} className={`space-y-4 ${GOOGLE_ENABLED && (mode === "signin" || mode === "signup") ? "" : "mt-6"}`}>
                {mode === "signup" && (
                  <div className="space-y-1.5"><Label>Nom complet</Label><Input className="h-11 rounded-xl bg-surface" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></div>
                )}
                {mode !== "reset" && (
                  <div className="space-y-1.5"><Label>E-mail</Label><Input className="h-11 rounded-xl bg-surface" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
                )}
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <Label>{mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}</Label>
                      {mode === "signin" && <button type="button" onClick={() => setMode("forgot")} className="ml-auto text-xs text-muted-foreground hover:text-primary">Oublié ?</button>}
                    </div>
                    <Input className="h-11 rounded-xl bg-surface" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signin" ? 6 : 8}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                  </div>
                )}
                <Button type="submit" className="w-full h-11 rounded-xl bg-ember-gradient text-white hover:opacity-95 font-semibold" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {{ signin: "Se connecter", signup: "Créer mon compte", forgot: "Envoyer le lien", reset: "Mettre à jour" }[mode]}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "signup" ? "Vous avez déjà un compte ?" : mode === "signin" ? "Nouveau sur Zoric ?" : ""}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="ml-1 font-semibold text-primary">
                  {mode === "signin" ? "Créer un compte" : "Se connecter"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
