import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useOfflineSync } from "@/hooks/useOfflineSync";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-card">
          <span className="text-4xl font-bold text-primary font-mono">404</span>
        </div>
        <h2 className="text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">La page que vous cherchez n'existe pas.</p>
        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary">
            ← Retour au tableau
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
          <svg className="h-10 w-10 text-destructive" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Erreur de chargement</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-8">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ThermoTrack — Suivi Étuves" },
      { name: "description", content: "Suivi en temps réel de la disponibilité des étuves et chambres climatiques." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&family=JetBrains+Mono:wght@500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

function Header() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg glow-primary transition-all group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" strokeLinecap="round" />
              <circle cx="8" cy="15" r="1.5" fill="currentColor" />
              <circle cx="12" cy="15" r="1.5" fill="currentColor" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold leading-tight tracking-tight text-foreground">ThermoTrack</div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground leading-tight">
              <LiveDot />
              Temps réel
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <ThemeToggle />
          <NavLink to="/" exact label="Tableau" icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          }/>
          <NavLink to="/chambres" label="Chambres" icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>
            </svg>
          }/>
          <NavLink to="/historique" label="Historique" icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }/>
          <NavLink to="/stats" label="Statistiques" icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
            </svg>
          }/>
          <NavLink to="/planification" label="Planning" icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }/>
          {isAdmin && (
            <NavLink to="/admin" label="Admin" icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            }/>
          )}
          {isAdmin && (
            <NavLink to="/users" label="Utilisateurs" icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
              </svg>
            }/>
          )}

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border/50">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-foreground leading-tight">{user.username}</span>
                <span className={`text-[10px] font-medium leading-tight ${user.role === "admin" ? "text-primary" : "text-success"}`}>
                  {user.role === "admin" ? "Administrateur" : "Technicien"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/>
                </svg>
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
    >
      {theme === "dark" ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4"/>
          <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 12c0 5.385 4.365 9.75 9.75 9.75 4.906 0 8.978-3.61 9.75-8.25-.083.001-.165.002-.248.002Z"/>
        </svg>
      )}
    </button>
  );
}

function NavLink({ to, label, icon, exact }: { to: string; label: string; icon: React.ReactNode; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      activeProps={{ className: "bg-primary/20 text-primary border border-primary/30 shadow-sm" }}
      className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function OfflineBanner() {
  const { online, syncing, pendingCount } = useOfflineSync();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (online && pendingCount === 0) return null;

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
      online
        ? "bg-warning/15 text-warning border-b border-warning/20"
        : "bg-destructive/10 text-destructive border-b border-destructive/20"
    }`}>
      {online ? (
        syncing ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Synchronisation en cours…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
            </svg>
            {pendingCount} action{pendingCount > 1 ? "s" : ""} en attente de synchronisation
          </>
        )
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 0 1 0 12.728m-3.536-3.536a4 4 0 0 1 0-5.656M9.172 9.172a4 4 0 0 0 0 5.656M5.636 5.636a9 9 0 0 0 0 12.728M12 12v.01"/>
          </svg>
          Mode hors-ligne · les données affichées sont en cache local
        </>
      )}
    </div>
  );
}

function AppShell() {
  const { user } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const needsRedirect = !user && !isLoginPage;

  useEffect(() => {
    if (needsRedirect) {
      router.navigate({ to: "/login" });
    }
  }, [needsRedirect, router]);

  // Pas connecté et pas sur /login : on affiche la page login inline
  // (évite l'écran blanc pendant la navigation)
  if (needsRedirect) {
    return <LoginPageInline />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isLoginPage && <Header />}
      {!isLoginPage && <OfflineBanner />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function LoginPageInline() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  // Nettoie le localStorage corrompu (ex: ancienne clé avec admin123)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("thermotrack_users");
      if (raw) {
        const users = JSON.parse(raw);
        // si le compte admin existe mais avec l'ancien mot de passe, on force le reset
        const hasAdmin = users.some(
          (u: any) => u.role === "admin" && u.password === "admin"
        );
        if (!hasAdmin) {
          localStorage.removeItem("thermotrack_users");
        }
      }
    } catch {
      localStorage.removeItem("thermotrack_users");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError("Veuillez saisir vos identifiants");
      return;
    }
    setLoading(true);
    const ok = login(u, p);
    if (ok) {
      router.navigate({ to: "/" });
    } else {
      setError("Identifiants incorrects");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg glow-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M3 10h18" strokeLinecap="round"/>
              <circle cx="8" cy="15" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="15" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ThermoTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suivi des étuves & chambres climatiques</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground">Accédez à votre espace de travail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom d'utilisateur</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
                </svg>
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant" autoComplete="username" autoFocus
                  className="w-full rounded-xl border border-border bg-secondary/30 pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
                </svg>
                <input
                  type={showPwd ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe" autoComplete="current-password"
                  className="w-full rounded-xl border border-border bg-secondary/30 pl-9 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
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
              type="submit" disabled={loading}
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

          {/* Identifiants par défaut */}
          <div className="mt-5 rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Identifiants par défaut
            </p>
            <button
              type="button"
              onClick={() => { setUsername("admin"); setPassword("admin"); setError(""); }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-primary/10 transition-colors group"
            >
              <span className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
                admin / admin
              </span>
              <span className="text-[10px] rounded-full bg-primary/15 px-2 py-0.5 text-primary font-semibold">
                Administrateur
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setUsername("technicien"); setPassword("tech123"); setError(""); }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-success/10 transition-colors group"
            >
              <span className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
                technicien / tech123
              </span>
              <span className="text-[10px] rounded-full bg-success/15 px-2 py-0.5 text-success font-semibold">
                Technicien
              </span>
            </button>
          </div>

          {/* Reset d'urgence si localStorage corrompu */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("thermotrack_users");
              localStorage.removeItem("thermotrack_auth");
              setError("");
              setUsername("");
              setPassword("");
              window.location.reload();
            }}
            className="mt-3 w-full text-center text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Réinitialiser les comptes (en cas de blocage)
          </button>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
