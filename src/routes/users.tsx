import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth, type StoredUser, type UserRole } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, X, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Utilisateurs — ThermoTrack" }] }),
});

function RoleBadge({ role }: { role: UserRole }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
      </svg>
      Administrateur
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
      </svg>
      Technicien
    </span>
  );
}

type EditState = { id: string; username: string; password: string; role: UserRole };

function UsersPage() {
  const { isAdmin, user: currentUser, getUsers, addUser, updateUser, deleteUser } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<StoredUser | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "technicien" as UserRole });
  const [adding, setAdding] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const list = await getUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Accès restreint</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cette page est réservée aux administrateurs.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
            ← Retour au tableau
          </Link>
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newUser.username.trim()) { toast.error("Nom d'utilisateur requis"); return; }
    if (!newUser.password.trim()) { toast.error("Mot de passe requis"); return; }
    setAdding(true);
    const res = await addUser(newUser);
    setAdding(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`Utilisateur "${newUser.username}" créé`);
    setNewUser({ username: "", password: "", role: "technicien" });
    setShowAdd(false);
    await refresh();
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editing.username.trim()) { toast.error("Nom d'utilisateur requis"); return; }
    setSaving(true);
    const res = await updateUser(editing.id, {
      username: editing.username.trim(),
      role: editing.role,
      ...(editing.password.trim() ? { password: editing.password.trim() } : {}),
    });
    setSaving(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Utilisateur mis à jour");
    setEditing(null);
    await refresh();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const res = await deleteUser(toDelete.id);
    if (!res.ok) { toast.error(res.error); }
    else { toast.success(`Utilisateur "${toDelete.username}" supprimé`); }
    setToDelete(null);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Administration</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestion des utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "…" : `${users.length} utilisateur${users.length > 1 ? "s" : ""}`} · Gérez les accès à ThermoTrack
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 border-border" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Bouton Ajouter */}
      <div className="mb-6">
        {!showAdd ? (
          <Button onClick={() => setShowAdd(true)} className="gap-2 glow-primary">
            <Plus className="h-4 w-4" /> Ajouter un utilisateur
          </Button>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Nouvel utilisateur</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom d'utilisateur *</label>
                <Input
                  placeholder="ex: jean.dupont"
                  value={newUser.username}
                  onChange={(e) => setNewUser((x) => ({ ...x, username: e.target.value }))}
                  className="bg-secondary/50 border-border"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe *</label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={newUser.password}
                    onChange={(e) => setNewUser((x) => ({ ...x, password: e.target.value }))}
                    className="bg-secondary/50 border-border pr-9"
                  />
                  <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    <EyeIcon open={showNewPwd} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
              <div className="flex gap-3">
                {(["technicien", "admin"] as UserRole[]).map((r) => (
                  <label key={r} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-all ${
                    newUser.role === r
                      ? r === "admin" ? "border-primary/40 bg-primary/10 text-primary" : "border-success/40 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/50"
                  }`}>
                    <input type="radio" name="new-role" value={r} checked={newUser.role === r}
                      onChange={() => setNewUser((x) => ({ ...x, role: r }))} className="sr-only"/>
                    <span className="text-sm font-medium">{r === "admin" ? "Administrateur" : "Technicien"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setShowAdd(false); setNewUser({ username: "", password: "", role: "technicien" }); }}>
                Annuler
              </Button>
              <Button onClick={handleAdd} disabled={adding} className="gap-2 glow-primary">
                {adding ? <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Création…</> : <><Plus className="h-4 w-4" /> Créer</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Utilisateur</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</th>
              <th className="w-48 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-4 py-3"><div className="h-8 w-40 animate-shimmer rounded-lg" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-24 animate-shimmer rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-8 w-32 animate-shimmer rounded-lg ml-auto" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Aucun utilisateur trouvé. La table app_users est peut-être vide.
                </td>
              </tr>
            ) : users.map((u, idx) => (
              <tr key={u.id} className={`border-b border-border/40 transition-colors ${idx % 2 !== 0 ? "bg-secondary/10" : ""}`}>
                {editing?.id === u.id ? (
                  <>
                    <td className="px-4 py-2.5" colSpan={2}>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nom</label>
                          <Input value={editing.username}
                            onChange={(e) => setEditing((x) => x ? { ...x, username: e.target.value } : x)}
                            className="h-8 text-sm bg-secondary/50 border-border" autoFocus />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nouveau MDP (optionnel)</label>
                          <div className="relative">
                            <Input type={showEditPwd ? "text" : "password"} placeholder="Laisser vide = inchangé"
                              value={editing.password}
                              onChange={(e) => setEditing((x) => x ? { ...x, password: e.target.value } : x)}
                              className="h-8 text-sm bg-secondary/50 border-border pr-8" />
                            <button type="button" onClick={() => setShowEditPwd((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              <EyeIcon open={showEditPwd} small />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rôle</label>
                          <select value={editing.role}
                            onChange={(e) => setEditing((x) => x ? { ...x, role: e.target.value as UserRole } : x)}
                            className="h-8 w-full rounded-lg border border-border bg-secondary/50 px-2 text-sm text-foreground outline-none focus:border-primary/60">
                            <option value="technicien">Technicien</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(null)} disabled={saving}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="h-8 gap-1.5 text-xs glow-primary px-3"
                          onClick={handleSaveEdit} disabled={saving}>
                          {saving ? <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            : <Check className="h-3.5 w-3.5" />}
                          Enregistrer
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase ${
                          u.role === "admin" ? "bg-primary/20 text-primary" : "bg-success/20 text-success"
                        }`}>
                          {u.username.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{u.username}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] rounded-full bg-border px-2 py-0.5 text-muted-foreground">vous</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-border"
                          onClick={() => { setEditing({ id: u.id, username: u.username, password: "", role: u.role }); setShowEditPwd(false); }}>
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                          onClick={() => setToDelete(u)} disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? "Impossible de supprimer votre propre compte" : "Supprimer"}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Les utilisateurs sont stockés dans la table <span className="font-mono">app_users</span> de Supabase.
      </p>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {toDelete && <>L'utilisateur <span className="font-bold text-foreground">{toDelete.username}</span> sera supprimé définitivement. Cette action est <span className="text-destructive font-medium">irréversible</span>.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EyeIcon({ open, small }: { open: boolean; small?: boolean }) {
  const cls = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return open ? (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
    </svg>
  ) : (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
    </svg>
  );
}
