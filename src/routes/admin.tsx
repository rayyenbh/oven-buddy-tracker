import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Oven, EquipmentKind } from "@/lib/oven-queries";
import { KindTabs, type KindFilter, KIND_LABEL_SINGULAR } from "@/lib/kind";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { Plus, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 15;

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Étuves — Administration" }] }),
});

function AdminPage() {
  const qc = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Accès réservé aux administrateurs");
      navigate({ to: "/" });
    }
  }, [authLoading, isAdmin, navigate]);

  const { data, isLoading } = useQuery<Oven[]>({
    queryKey: ["ovens-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ovens").select("*").order("position");
      if (error) throw error;
      return data as Oven[];
    },
    enabled: isAdmin,
  });

  const [edits, setEdits] = useState<Record<string, { serial_number: string; internal_number: string }>>({});
  const [newOven, setNewOven] = useState<{ internal_number: string; serial_number: string; kind: EquipmentKind }>({ internal_number: "", serial_number: "", kind: "etuve" });
  const [toDelete, setToDelete] = useState<Oven | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
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
    let arr = data;
    if (kindFilter !== "all") arr = arr.filter(o => o.kind === kindFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(o => o.internal_number.toLowerCase().includes(q) || o.serial_number.toLowerCase().includes(q));
    }
    return arr;
  }, [data, search, kindFilter]);

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
      const { error } = await supabase
        .from("ovens")
        .update({ serial_number: v.serial_number.trim(), internal_number: v.internal_number.trim(), updated_at: new Date().toISOString() })
        .eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Étuve mise à jour"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const internal = newOven.internal_number.trim();
      const serial = newOven.serial_number.trim();
      if (!internal || !serial) throw new Error("Champs requis");
      const maxPos = (data ?? []).reduce((m, o) => Math.max(m, o.position), 0);
      const { error } = await supabase.from("ovens").insert({ internal_number: internal, serial_number: serial, kind: newOven.kind, position: maxPos + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${KIND_LABEL_SINGULAR[newOven.kind]} ajoutée`); setNewOven({ internal_number: "", serial_number: "", kind: newOven.kind }); invalidate(); },
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

  if (authLoading || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configuration</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Administration des équipements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez le parc d'étuves et de chambres climatiques · Numéro interne (ex: RD 112) · Numéro de série (ex: B621.0021)
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-primary/20 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ajouter un équipement</h2>
        </div>
        <div className="mb-3 flex gap-2">
          {(["etuve", "chambre_climatique"] as EquipmentKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setNewOven((x) => ({ ...x, kind: k }))}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all border ${
                newOven.kind === k
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {KIND_LABEL_SINGULAR[k]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input className="font-mono bg-secondary/50 border-border" placeholder="Numéro interne (RD 112)" value={newOven.internal_number} onChange={(e) => setNewOven((x) => ({ ...x, internal_number: e.target.value }))} />
          <Input className="font-mono bg-secondary/50 border-border" placeholder="Numéro de série (B621.0021)" value={newOven.serial_number} onChange={(e) => setNewOven((x) => ({ ...x, serial_number: e.target.value }))} />
          <Button onClick={() => addMut.mutate()} disabled={addMut.isPending} className="shrink-0 glow-primary">
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <KindTabs value={kindFilter} onChange={(v) => { setKindFilter(v); setPage(1); }} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {isLoading ? "…" : `${filtered.length} équipement${filtered.length > 1 ? "s" : ""}${search || kindFilter !== "all" ? " trouvé(s)" : " enregistré(s)"}`}
        </span>
        <div className="relative sm:w-64 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Rechercher RD, B621…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 bg-card border-border text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-12 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numéro interne</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numéro de série</th>
              <th className="w-48 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3"><div className="h-4 w-6 animate-shimmer rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-shimmer rounded" /></td>
                  <td className="px-4 py-3"><div className="h-8 animate-shimmer rounded-lg" /></td>
                  <td className="px-4 py-3"><div className="h-8 animate-shimmer rounded-lg" /></td>
                  <td className="px-4 py-3"><div className="h-8 w-36 animate-shimmer rounded-lg" /></td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">Aucun équipement</td></tr>
            ) : (
              paginated.map((o, idx) => (
                <tr key={o.id} className={`border-b border-border/40 transition-colors hover:bg-secondary/20 ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-muted-foreground">{o.position}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      o.kind === "etuve" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
                    }`}>
                      {KIND_LABEL_SINGULAR[o.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Input className="font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-secondary/30 transition-all" value={edits[o.id]?.internal_number ?? ""} onChange={(e) => setEdits((x) => ({ ...x, [o.id]: { ...x[o.id], internal_number: e.target.value } }))} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Input className="font-mono bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-secondary/30 transition-all" value={edits[o.id]?.serial_number ?? ""} onChange={(e) => setEdits((x) => ({ ...x, [o.id]: { ...x[o.id], serial_number: e.target.value } }))} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => saveMut.mutate(o)} disabled={saveMut.isPending}>Enregistrer</Button>
                      <Button size="sm" variant="destructive" className="px-2" onClick={() => setToDelete(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">Page {safePage}/{totalPages} · {filtered.length} étuves</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-border" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Supprimer cette étuve ?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {toDelete && <>L'étuve <span className="font-mono font-bold text-foreground">{toDelete.internal_number}</span> ({toDelete.serial_number}) sera supprimée définitivement avec son historique.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (toDelete) deleteMut.mutate(toDelete); }} disabled={deleteMut.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMut.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
