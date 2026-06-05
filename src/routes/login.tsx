import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Connexion — ThermoTrack" }] }),
});

function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  if (user) {
    router.navigate({ to: "/" });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Veuillez saisir vos identifiants");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = login(username.trim(), password);
      if (ok) {
        toast.success("Connexion réussie");
        router.navigate({ to: "/" });
      } else {
        toast.error("Identifiants incorrects");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg glow-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" strokeLinecap="round" />
              <circle cx="8" cy="15" r="1.5" fill="currentColor" />
              <circle cx="12" cy="15" r="1.5" fill="currentColor" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ThermoTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suivi des étuves & chambres climatiques</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground">Accédez à votre espace de travail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  autoComplete="username"
                  className="w-full rounded-xl border border-border bg-secondary/30 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
                </svg>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-border bg-secondary/30 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60 glow-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Connexion…
                </>
              ) : "Se connecter"}
            </button>
          </form>

          {/* Hint */}
          {/* <div className="mt-5 rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comptes de démonstration</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">admin / admin123</span>
              <span className="text-[10px] rounded-full bg-primary/15 px-2 py-0.5 text-primary font-semibold">Administrateur</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">technicien / tech123</span>
              <span className="text-[10px] rounded-full bg-success/15 px-2 py-0.5 text-success font-semibold">Technicien</span>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
