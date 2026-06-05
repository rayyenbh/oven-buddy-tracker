import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Oven, ChambreClimatique } from "@/lib/oven-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 15;

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Administration — ThermoTrack" }] }),
});

type Tab = "etuves" | "chambres";

function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("etuves");

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Accès restreint</h2>
          <p className="mt-2 text-sm text-muted-foreground">Cette page est réservée aux administrateurs.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
            ← Retour au tableau
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configuration</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez le parc d'étuves et de chambres climatiques
        </p>
      </div>

      {/* Onglets */}
      <div className="mb-6 inline-flex rounded-xl border border-border bg-card p-1 gap-1">
        <button
          onClick={() => setTab("etuves")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "etuves" ? "bg-primary text-primary-foreground shadow-sm glow-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18" strokeLinecap="round"/>
            <circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/>
          </svg>
          Étuves
        </button>
        <button
          onClick={() => setTab("chambres")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "chambres" ? "bg-primary text-primary-foreground shadow-sm glow-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>
          </svg>
          Chambres climatiques
        </button>
      </div>

      {tab === "etuves" ? <OvensPanel /> : <ChambresPanel />}
    </div>
  );
}

/* ─── Panel Étuves ─────────────────────────────────────────────────────────── */
function OvensPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Oven[]>({
    queryKey: ["ovens-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ovens").select("*").order("position");
      if (error) throw error;
      return data as Oven[];
    },
  });

  const [edits, setEdits] = useState<Record<string, { serial_number: string; internal_number: string }>>({});
  const [newItem, setNewItem] = useState({ internal_number: "", serial_number: "" });
  const [toDelete, setToDelete] = useState<Oven | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (data) {
      const m: typeof edits = {};
      data.forEach((o) => { m[o.id] = { serial_number: o.serial_number, internal_number: o.internal_number }; });
      setEdits(m);
    }
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(o => o.internal_number.toLowerCase().includes(q) || o.serial_number.toLowerCase().includes(q));
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ovens-admin"] });
    qc.invalidateQueries({ queryKey: ["ovens"] });
  };

  const saveMut = useMutation({
    mutationFn: async (o: Oven) => {
      const v = edits[o.id];
      if (!v.serial_number.trim() || !v.internal_number.trim()) throw new Error("Champs requis");
      const { error } = await supabase.from("ovens")
        .update({ serial_number: v.serial_number.trim(), internal_number: v.internal_number.trim(), updated_at: new Date().toISOString() })
        .eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Étuve mise à jour"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const internal = newItem.internal_number.trim();
      const serial = newItem.serial_number.trim();
      if (!internal || !serial) throw new Error("Champs requis");
      const maxPos = (data ?? []).reduce((m, o) => Math.max(m, o.position), 0);
      const { error } = await supabase.from("ovens").insert({ internal_number: internal, serial_number: serial, position: maxPos + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Étuve ajoutée"); setNewItem({ internal_number: "", serial_number: "" }); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteMut = useMutation({
    mutationFn: async (o: Oven) => {
      const { count, error: cErr } = await supabase.from("operations").select("id", { count: "exact", head: true }).eq("oven_id", o.id).eq("status", "active");
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) throw new Error("Impossible : une opération est en cours sur cette étuve");
      const { error: opErr } = await supabase.from("operations").delete().eq("oven_id", o.id);
      if (opErr) throw opErr;
      const { error } = await supabase.from("ovens").delete().eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Étuve supprimée"); setToDelete(null); invalidate(); },
    onError: (e: any) => { toast.error(e.message ?? "Erreur"); setToDelete(null); },
  });

  return (
    <DevicePanel
      title="Étuves"
      subtitle="Numéro interne (ex: RD 112) · Numéro de série (ex: B621.0021)"
      addLabel="Ajouter une étuve"
      newItem={newItem}
      setNewItem={setNewItem}
      onAdd={() => addMut.mutate()}
      addPending={addMut.isPending}
      search={search}
      setSearch={(v) => { setSearch(v); setPage(1); }}
      isLoading={isLoading}
      filtered={filtered}
      paginated={paginated}
      edits={edits}
      setEdits={setEdits}
      onSave={(o) => saveMut.mutate(o as Oven)}
      savePending={saveMut.isPending}
      onDelete={(o) => setToDelete(o as Oven)}
      page={safePage}
      totalPages={totalPages}
      setPage={setPage}
      deleteDialog={
        <DeviceDeleteDialog
          open={!!toDelete}
          onClose={() => setToDelete(null)}
          label={toDelete ? `${toDelete.internal_number} (${toDelete.serial_number})` : ""}
          entityName="étuve"
          onConfirm={() => { if (toDelete) deleteMut.mutate(toDelete); }}
          pending={deleteMut.isPending}
        />
      }
    />
  );
}

/* ─── Panel Chambres ───────────────────────────────────────────────────────── */
function ChambresPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ChambreClimatique[]>({
    queryKey: ["chambres-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("chambres_climatiques").select("*").order("position");
      if (error) throw error;
      return data as ChambreClimatique[];
    },
  });

  const [edits, setEdits] = useState<Record<string, { serial_number: string; internal_number: string }>>({});
  const [newItem, setNewItem] = useState({ internal_number: "", serial_number: "" });
  const [toDelete, setToDelete] = useState<ChambreClimatique | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (data) {
      const m: typeof edits = {};
      data.forEach((c) => { m[c.id] = { serial_number: c.serial_number, internal_number: c.internal_number }; });
      setEdits(m);
    }
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(c => c.internal_number.toLowerCase().includes(q) || c.serial_number.toLowerCase().includes(q));
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["chambres-admin"] });
    qc.invalidateQueries({ queryKey: ["chambres"] });
  };

  const saveMut = useMutation({
    mutationFn: async (c: ChambreClimatique) => {
      const v = edits[c.id];
      if (!v.serial_number.trim() || !v.internal_number.trim()) throw new Error("Champs requis");
      const { error } = await (supabase as any).from("chambres_climatiques")
        .update({ serial_number: v.serial_number.trim(), internal_number: v.internal_number.trim(), updated_at: new Date().toISOString() })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chambre mise à jour"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const internal = newItem.internal_number.trim();
      const serial = newItem.serial_number.trim();
      if (!internal || !serial) throw new Error("Champs requis");
      const maxPos = (data ?? []).reduce((m, c) => Math.max(m, c.position), 0);
      const { error } = await (supabase as any).from("chambres_climatiques").insert({ internal_number: internal, serial_number: serial, position: maxPos + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chambre ajoutée"); setNewItem({ internal_number: "", serial_number: "" }); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteMut = useMutation({
    mutationFn: async (c: ChambreClimatique) => {
      const { count, error: cErr } = await (supabase as any).from("operations_chambres").select("id", { count: "exact", head: true }).eq("chambre_id", c.id).eq("status", "active");
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) throw new Error("Impossible : une opération est en cours sur cette chambre");
      const { error: opErr } = await (supabase as any).from("operations_chambres").delete().eq("chambre_id", c.id);
      if (opErr) throw opErr;
      const { error } = await (supabase as any).from("chambres_climatiques").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chambre supprimée"); setToDelete(null); invalidate(); },
    onError: (e: any) => { toast.error(e.message ?? "Erreur"); setToDelete(null); },
  });

  return (
    <DevicePanel
      title="Chambres climatiques"
      subtitle="Numéro interne (ex: CC 01) · Numéro de série"
      addLabel="Ajouter une chambre"
      newItem={newItem}
      setNewItem={setNewItem}
      onAdd={() => addMut.mutate()}
      addPending={addMut.isPending}
      search={search}
      setSearch={(v) => { setSearch(v); setPage(1); }}
      isLoading={isLoading}
      filtered={filtered}
      paginated={paginated}
      edits={edits}
      setEdits={setEdits}
      onSave={(c) => saveMut.mutate(c as ChambreClimatique)}
      savePending={saveMut.isPending}
      onDelete={(c) => setToDelete(c as ChambreClimatique)}
      page={safePage}
      totalPages={totalPages}
      setPage={setPage}
      deleteDialog={
        <DeviceDeleteDialog
          open={!!toDelete}
          onClose={() => setToDelete(null)}
          label={toDelete ? `${toDelete.internal_number} (${toDelete.serial_number})` : ""}
          entityName="chambre"
          onConfirm={() => { if (toDelete) deleteMut.mutate(toDelete); }}
          pending={deleteMut.isPending}
        />
      }
    />
  );
}

/* ─── Composant générique partagé ──────────────────────────────────────────── */
type DeviceItem = { id: string; position: number; serial_number: string; internal_number: string };

function DevicePanel({
  title, subtitle, addLabel, newItem, setNewItem, onAdd, addPending,
  search, setSearch, isLoading, filtered, paginated, edits, setEdits,
  onSave, savePending, onDelete, page, totalPages, setPage, deleteDialog,
}: {
  title: string; subtitle: string; addLabel: string;
  newItem: { internal_number: string; serial_number: string };
  setNewItem: (v: { internal_number: string; serial_number: string }) => void;
  onAdd: () => void; addPending: boolean;
  search: string; setSearch: (v: string) => void;
  isLoading: boolean;
  filtered: DeviceItem[]; paginated: DeviceItem[];
  edits: Record<string, { serial_number: string; internal_number: string }>;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, { serial_number: string; internal_number: string }>>>;
  onSave: (item: DeviceItem) => void; savePending: boolean;
  onDelete: (item: DeviceItem) => void;
  page: number; totalPages: number; setPage: (p: number | ((p: number) => number)) => void;
  deleteDialog: React.ReactNode;
}) {
  return (
    <>
      {/* Add form */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{addLabel}</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input className="font-mono bg-secondary/50 border-border" placeholder="Numéro interne"
            value={newItem.internal_number} onChange={(e) => setNewItem({ ...newItem, internal_number: e.target.value })} />
          <Input className="font-mono bg-secondary/50 border-border" placeholder="Numéro de série"
            value={newItem.serial_number} onChange={(e) => setNewItem({ ...newItem, serial_number: e.target.value })} />
          <Button onClick={onAdd} disabled={addPending} className="shrink-0 glow-primary">
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {isLoading ? "…" : `${filtered.length} ${title.toLowerCase()}${filtered.length > 1 ? "s" : ""}${search ? " trouvés" : ""}`}
        </span>
        <div className="relative sm:w-64 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-12 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numéro interne</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numéro de série</th>
              <th className="w-48 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {[6, null, null, 36].map((w, j) => (
                    <td key={j} className="px-4 py-3"><div className={`h-8 animate-shimmer rounded-lg ${w ? `w-${w}` : ""}`} /></td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Aucun résultat pour "{search}"</p>
                  <button onClick={() => setSearch("")} className="mt-2 text-xs text-primary hover:underline">Effacer</button>
                </td>
              </tr>
            ) : paginated.map((item, idx) => (
              <tr key={item.id} className={`border-b border-border/40 transition-colors hover:bg-secondary/20 ${idx % 2 !== 0 ? "bg-secondary/10" : ""}`}>
                <td className="px-4 py-3 font-mono text-sm font-bold text-muted-foreground">{item.position}</td>
                <td className="px-4 py-2.5">
                  <Input className="font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-secondary/30 transition-all"
                    value={edits[item.id]?.internal_number ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [item.id]: { ...x[item.id], internal_number: e.target.value } }))} />
                </td>
                <td className="px-4 py-2.5">
                  <Input className="font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-secondary/30 transition-all"
                    value={edits[item.id]?.serial_number ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [item.id]: { ...x[item.id], serial_number: e.target.value } }))} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="border-border text-xs"
                      onClick={() => onSave(item)} disabled={savePending}>Enregistrer</Button>
                    <Button size="sm" variant="destructive" className="px-2" onClick={() => onDelete(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">Page {page} sur {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === "…"
                  ? <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  : <Button key={p} size="sm" variant={page === p ? "default" : "outline"}
                      className={`h-8 w-8 p-0 text-xs ${page === p ? "glow-primary" : "border-border"}`}
                      onClick={() => setPage(p as number)}>{p}</Button>
                )}
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {deleteDialog}
    </>
  );
}

function DeviceDeleteDialog({ open, onClose, label, entityName, onConfirm, pending }: {
  open: boolean; onClose: () => void; label: string; entityName: string;
  onConfirm: () => void; pending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">Supprimer cette {entityName} ?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <span className="font-mono font-bold text-foreground">{label}</span> sera supprimée définitivement avec son historique.{" "}
            <span className="text-destructive font-medium">Irréversible.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
