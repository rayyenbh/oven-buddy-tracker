import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "technicien";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRoleAndProfile = async (uid: string) => {
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("full_name, email").eq("id", uid).maybeSingle(),
    ]);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);
    setRole(roles.includes("admin") ? "admin" : roles.includes("technicien") ? "technicien" : null);
    setFullName(profile?.full_name || profile?.email || "");
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        loadRoleAndProfile(session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => loadRoleAndProfile(session.user.id), 0);
      } else {
        setRole(null);
        setFullName("");
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    role,
    fullName,
    loading,
    isAdmin: role === "admin",
    signOut: async () => { await supabase.auth.signOut(); },
    refreshRole: async () => {
      if (session?.user) await loadRoleAndProfile(session.user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
