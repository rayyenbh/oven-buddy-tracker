import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { ShieldCheck, Wrench, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Utilisateurs — Administration" }] }),
});

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
};

function UsersPage() {
  const qc = useQueryClient();
  const { user: me, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("technicien");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Accès réservé aux administrateurs");
      navigate({ to: "/" });
    }
  }, [authLoading, isAdmin, navigate]);

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const byUser = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = byUser.get(r.user_id) ?? [];
        arr.push(r.role);
        byUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const setRoleMut = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const createUserMut = useMutation({
    mutationFn: async () => {
      if (!newEmail.trim()) throw new Error("L'email est requis");
      if (!newFullName.trim()) throw new Error("Le nom complet est requis");
      if (!newPassword || newPassword.length < 6) throw new Error("Le mot de passe doit faire au moins 6 caractères");
      const { error } = await supabase.auth.signUp({
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: newFullName.trim(), requested_role: newRole },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte créé. L'utilisateur doit confirmer son email pour se connecter.");
      setNewEmail("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("technicien");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteUserMut = useMutation({
    mutationFn: async (userId: string) => {
      const [{ error: roleErr }, { error: profileErr }] = await Promise.all([
        supabase.from("user_roles").delete().eq("user_id", userId),
        supabase.from("profiles").delete().eq("id", userId),
      ]);
      if (roleErr) throw roleErr;
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      toast.success("Utilisateur retiré de la liste");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (authLoading || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comptes</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestion des utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez des comptes depuis cette page et attribuez le rôle <span className="font-medium text-warning">admin</span> ou <span className="font-medium text-primary">technicien</span>.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Créer un utilisateur</h2>
            <p className="text-sm text-muted-foreground">L’administrateur gère l’inscription des comptes depuis ici.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nom complet</label>
            <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="utilisateur@exemple.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1">
              {(["technicien", "admin"] as AppRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewRole(role)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all ${
                    newRole === role ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => createUserMut.mutate()} disabled={createUserMut.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> {createUserMut.isPending ? "Création…" : "Créer le compte"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Utilisateur</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td colSpan={4} className="px-4 py-4"><div className="h-6 animate-shimmer rounded" /></td>
                </tr>
              ))
            ) : (users ?? []).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun utilisateur</td></tr>
            ) : (
              (users ?? []).map((u) => {
                const role: AppRole = u.roles.includes("admin") ? "admin" : "technicien";
                const isMe = me?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-border/40 hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{u.full_name || "—"}</div>
                      {isMe && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">vous</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        role === "admin" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
                      }`}>
                        {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                        {role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
                        <Button
                          size="sm" variant={role === "technicien" ? "default" : "ghost"}
                          className="h-7 text-xs px-2"
                          disabled={setRoleMut.isPending || (isMe && role === "admin")}
                          onClick={() => setRoleMut.mutate({ userId: u.id, role: "technicien" })}
                          title={isMe && role === "admin" ? "Vous ne pouvez pas vous rétrograder vous-même" : ""}
                        >
                          Technicien
                        </Button>
                        <Button
                          size="sm" variant={role === "admin" ? "default" : "ghost"}
                          className="h-7 text-xs px-2"
                          disabled={setRoleMut.isPending}
                          onClick={() => setRoleMut.mutate({ userId: u.id, role: "admin" })}
                        >
                          Admin
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteUserMut.isPending || isMe}
                          onClick={() => deleteUserMut.mutate(u.id)}
                          title={isMe ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer l'utilisateur"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        ⚠️ Les admins peuvent ajouter, modifier et supprimer les comptes depuis cette page. Les techniciens peuvent uniquement créer et suivre les opérations.
      </p>
    </div>
  );
}
