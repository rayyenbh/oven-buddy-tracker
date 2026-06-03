import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { ShieldCheck, Wrench } from "lucide-react";

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
      // Remove all existing roles for this user, then set the new one.
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

  if (authLoading || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comptes</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestion des utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attribuez le rôle <span className="font-medium text-warning">admin</span> ou <span className="font-medium text-primary">technicien</span> à chaque compte.
        </p>
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
        ⚠️ Les admins peuvent ajouter, modifier et supprimer les étuves ainsi que gérer les utilisateurs. Les techniciens peuvent uniquement créer et suivre les opérations.
      </p>
    </div>
  );
}
