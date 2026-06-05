import React, { createContext, useContext, useState } from "react";

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
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  getUsers: () => StoredUser[];
  addUser: (u: Omit<StoredUser, "id">) => { ok: boolean; error?: string };
  updateUser: (id: string, changes: Partial<Omit<StoredUser, "id">>) => { ok: boolean; error?: string };
  deleteUser: (id: string) => { ok: boolean; error?: string };
}

const USERS_KEY = "thermotrack_users";
const AUTH_KEY  = "thermotrack_auth";

const DEFAULT_USERS: StoredUser[] = [
  { id: "1", username: "admin",      password: "admin",   role: "admin" },
  { id: "2", username: "technicien", password: "tech123", role: "technicien" },
];

// Vérifie si on est côté navigateur
const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

function loadUsers(): StoredUser[] {
  if (!isBrowser) return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      // première visite : initialise avec les comptes par défaut
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as StoredUser[];
    // s'assure qu'il y a toujours au moins le compte admin
    if (!parsed.some((u) => u.role === "admin")) {
      const merged = [...parsed, DEFAULT_USERS[0]];
      localStorage.setItem(USERS_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users: StoredUser[]) {
  if (!isBrowser) return;
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
}

function loadCurrentUser(): AuthUser | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadCurrentUser);

  const login = (username: string, password: string): boolean => {
    const trimUser = username.trim();
    const trimPass = password; // ne pas trim le mot de passe

    // charge les utilisateurs (navigateur uniquement)
    const users = loadUsers();

    const found = users.find(
      (u) =>
        u.username.toLowerCase() === trimUser.toLowerCase() &&
        u.password === trimPass
    );

    if (!found) return false;

    const authUser: AuthUser = { id: found.id, username: found.username, role: found.role };
    setUser(authUser);
    if (isBrowser) {
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(authUser)); } catch {}
    }
    return true;
  };

  const logout = () => {
    setUser(null);
    if (isBrowser) {
      try { localStorage.removeItem(AUTH_KEY); } catch {}
    }
  };

  const getUsers = (): StoredUser[] => loadUsers();

  const addUser = (u: Omit<StoredUser, "id">): { ok: boolean; error?: string } => {
    if (!u.username.trim()) return { ok: false, error: "Nom d'utilisateur requis" };
    if (!u.password.trim()) return { ok: false, error: "Mot de passe requis" };
    const users = loadUsers();
    if (users.some((x) => x.username.toLowerCase() === u.username.trim().toLowerCase()))
      return { ok: false, error: "Ce nom d'utilisateur existe déjà" };
    saveUsers([...users, { ...u, username: u.username.trim(), id: genId() }]);
    return { ok: true };
  };

  const updateUser = (id: string, changes: Partial<Omit<StoredUser, "id">>): { ok: boolean; error?: string } => {
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return { ok: false, error: "Utilisateur introuvable" };
    if (changes.username) {
      const dup = users.find(
        (u) => u.id !== id && u.username.toLowerCase() === changes.username!.toLowerCase()
      );
      if (dup) return { ok: false, error: "Ce nom d'utilisateur existe déjà" };
    }
    const updated = { ...users[idx], ...changes };
    users[idx] = updated;
    saveUsers(users);
    if (user?.id === id) {
      const newAuth: AuthUser = { id: updated.id, username: updated.username, role: updated.role };
      setUser(newAuth);
      if (isBrowser) {
        try { localStorage.setItem(AUTH_KEY, JSON.stringify(newAuth)); } catch {}
      }
    }
    return { ok: true };
  };

  const deleteUser = (id: string): { ok: boolean; error?: string } => {
    if (user?.id === id) return { ok: false, error: "Impossible de supprimer votre propre compte" };
    const users = loadUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "Utilisateur introuvable" };
    if (target.role === "admin" && users.filter((u) => u.role === "admin").length <= 1)
      return { ok: false, error: "Il doit rester au moins un administrateur" };
    saveUsers(users.filter((u) => u.id !== id));
    return { ok: true };
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAdmin: user?.role === "admin", getUsers, addUser, updateUser, deleteUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
