import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email et mot de passe requis");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Connexion réussie");
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground glow-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" strokeLinecap="round" />
              <circle cx="8" cy="15" r="1.5" fill="currentColor" />
              <circle cx="12" cy="15" r="1.5" fill="currentColor" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">ThermoTrack</h1>
            <p className="mt-1 text-sm text-muted-foreground">Suivi des étuves de traitement thermique</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Connexion</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les comptes sont créés par un administrateur depuis la page Utilisateurs.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full glow-primary">
              {loading ? "Patientez…" : "Se connecter"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Outil interne · Accès réservé aux techniciens et administrateurs
        </p>
      </div>
    </div>
  );
}
