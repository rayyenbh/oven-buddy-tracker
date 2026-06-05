import React, { createContext, useContext, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "technicien";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface StoredUser extends AuthUser {
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  getUsers: () => Promise<StoredUser[]>;
  addUser: (u: Omit<StoredUser, "id">) => Promise<{ ok: boolean; error?: string }>;
  updateUser: (id: string, changes: Partial<Omit<StoredUser, "id">>) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

const AUTH_KEY   = "thermotrack_auth";
const USERS_KEY  = "thermotrack_users";
const isBrowser  = typeof window !== "undefined";

// ── Comptes par défaut (fallback si Supabase indisponible) ──────────────────
const DEFAULT_USERS: StoredUser[] = [
  { id: "1", username: "admin",      password: "admin",   role: "admin" },
  { id: "2", username: "technicien", password: "tech123", role: "technicien" },
];

// ── localStorage helpers ────────────────────────────────────────────────────
function lsGet<T>(key: string): T | null {
  if (!isBrowser) return null;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function lsSet(key: string, val: unknown) {
  if (!isBrowser) return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsDel(key: string) {
  if (!isBrowser) return;
  try { localStorage.removeItem(key); } catch {}
}

function loadLocalUsers(): StoredUser[] {
  const stored = lsGet<StoredUser[]>(USERS_KEY);
  if (!stored || stored.length === 0) {
    lsSet(USERS_KEY, DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  return stored;
}

function saveLocalUsers(users: StoredUser[]) {
  lsSet(USERS_KEY, users);
}

// ── Auth context ─────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => lsGet<AuthUser>(AUTH_KEY));

  // ── login : essaie Supabase, fallback localStorage ──────────────────────
  const login = async (username: string, password: string): Promise<boolean> => {
    const u = username.trim();
    if (!u || !password) return false;

    // 1. Essai Supabase
    try {
      const { data, error } = await (supabase as any)
        .from("app_users")
        .select("id, username, role, password_hash")
        .eq("username", u)
        .eq("password_hash", password)
        .maybeSingle();

      if (!error && data) {
        const authUser: AuthUser = { id: data.id, username: data.username, role: data.role };
        setUser(authUser);
        lsSet(AUTH_KEY, authUser);
        return true;
      }
    } catch { /* Supabase indisponible → fallback */ }

    // 2. Fallback localStorage
    const localUsers = loadLocalUsers();
    const found = localUsers.find(
      (x) => x.username.toLowerCase() === u.toLowerCase() && x.password === password
    );
    if (!found) return false;
    const authUser: AuthUser = { id: found.id, username: found.username, role: found.role };
    setUser(authUser);
    lsSet(AUTH_KEY, authUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    lsDel(AUTH_KEY);
  };

  // ── getUsers : Supabase + sync localStorage ──────────────────────────────
  const getUsers = async (): Promise<StoredUser[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from("app_users")
        .select("id, username, role, password_hash")
        .order("created_at");
      if (!error && data && data.length > 0) {
        const users: StoredUser[] = data.map((x: any) => ({
          id: x.id, username: x.username, role: x.role, password: x.password_hash,
        }));
        saveLocalUsers(users); // sync vers localStorage
        return users;
      }
    } catch {}
    // Fallback localStorage
    return loadLocalUsers();
  };

  // ── addUser ──────────────────────────────────────────────────────────────
  const addUser = async (u: Omit<StoredUser, "id">): Promise<{ ok: boolean; error?: string }> => {
    if (!u.username.trim()) return { ok: false, error: "Nom d'utilisateur requis" };
    if (!u.password.trim()) return { ok: false, error: "Mot de passe requis" };

    // Supabase
    try {
      const { error } = await (supabase as any)
        .from("app_users")
        .insert({ username: u.username.trim(), password_hash: u.password.trim(), role: u.role });
      if (error) {
        if (error.code === "23505") return { ok: false, error: "Ce nom d'utilisateur existe déjà" };
        throw error;
      }
    } catch {
      // Fallback localStorage
      const local = loadLocalUsers();
      if (local.some((x) => x.username.toLowerCase() === u.username.trim().toLowerCase()))
        return { ok: false, error: "Ce nom d'utilisateur existe déjà" };
      const newId = Date.now().toString(36);
      saveLocalUsers([...local, { ...u, username: u.username.trim(), id: newId }]);
    }
    return { ok: true };
  };

  // ── updateUser ───────────────────────────────────────────────────────────
  const updateUser = async (
    id: string, changes: Partial<Omit<StoredUser, "id">>
  ): Promise<{ ok: boolean; error?: string }> => {
    const payload: Record<string, string> = { updated_at: new Date().toISOString() };
    if (changes.username) payload.username      = changes.username.trim();
    if (changes.role)     payload.role          = changes.role;
    if (changes.password) payload.password_hash = changes.password.trim();

    try {
      const { error } = await (supabase as any).from("app_users").update(payload).eq("id", id);
      if (error) {
        if (error.code === "23505") return { ok: false, error: "Ce nom d'utilisateur existe déjà" };
        throw error;
      }
    } catch {
      // Fallback localStorage
      const local = loadLocalUsers();
      const idx = local.findIndex((x) => x.id === id);
      if (idx === -1) return { ok: false, error: "Utilisateur introuvable" };
      local[idx] = { ...local[idx], ...changes };
      saveLocalUsers(local);
    }

    if (user?.id === id) {
      const newAuth: AuthUser = {
        id, username: changes.username?.trim() ?? user.username,
        role: (changes.role ?? user.role) as UserRole,
      };
      setUser(newAuth);
      lsSet(AUTH_KEY, newAuth);
    }
    return { ok: true };
  };

  // ── deleteUser ───────────────────────────────────────────────────────────
  const deleteUser = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (user?.id === id) return { ok: false, error: "Impossible de supprimer votre propre compte" };

    try {
      const { data } = await (supabase as any)
        .from("app_users").select("id, role").eq("role", "admin");
      if (data && data.filter((x: any) => x.role === "admin").length <= 1
        && data.find((x: any) => x.id === id))
        return { ok: false, error: "Il doit rester au moins un administrateur" };

      const { error } = await (supabase as any).from("app_users").delete().eq("id", id);
      if (error) throw error;
    } catch {
      // Fallback localStorage
      const local = loadLocalUsers();
      if (local.filter((x) => x.role === "admin").length <= 1
        && local.find((x) => x.id === id)?.role === "admin")
        return { ok: false, error: "Il doit rester au moins un administrateur" };
      saveLocalUsers(local.filter((x) => x.id !== id));
    }
    return { ok: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin", getUsers, addUser, updateUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
