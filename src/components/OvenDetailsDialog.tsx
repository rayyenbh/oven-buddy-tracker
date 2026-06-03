import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OvenWithActive } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function ElapsedTimer({ startISO }: { startISO: string }) {
  const [elapsed, setElapsed] = React.useState(() => fmt(startISO));
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(fmt(startISO)), 30_000);
    return () => clearInterval(t);
  }, [startISO]);
  return <span className="font-mono font-bold text-busy tabular-nums">{elapsed}</span>;
}
function fmt(startISO: string) {
  const diff = Math.max(0, Date.now() - new Date(startISO).getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function OvenDetailsDialog({
  oven,
  open,
  onOpenChange,
}: {
  oven: OvenWithActive | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const endMut = useMutation({
    mutationFn: async () => {
      if (!oven?.active) throw new Error("no active");
      const now = new Date();
      const { error } = await supabase
        .from("operations")
        .update({
          status: "completed",
          ended_at: now.toISOString(),
          date_fin: oven.active.date_fin ?? now.toISOString().slice(0, 10),
          heure_fin: oven.active.heure_fin ?? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
        })
        .eq("id", oven.active.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération terminée — étuve libérée");
      qc.invalidateQueries({ queryKey: ["ovens"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (!oven || !oven.active) return null;
  const a = oven.active;
  const startISO = `${a.date_debut}T${a.heure_debut}`;
  const cables = a.cables ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-busy/15 shrink-0">
              <svg className="h-5 w-5 text-busy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.387Z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-foreground">{oven.internal_number}</span>
                <span className="font-mono text-sm font-normal text-muted-foreground">{oven.serial_number}</span>
              </DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-busy/15 px-2 py-0.5 text-xs font-semibold text-busy">
                  <span className="h-1.5 w-1.5 rounded-full bg-busy animate-pulse-dot" />
                  Étuve en opération
                </span>
                <ElapsedTimer startISO={startISO} />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 rounded-xl border border-border/50 bg-secondary/30 px-4 py-1">
          <DetailRow label="Demandeur" value={a.demandeur} />
          <DetailRow label="Réalisateur" value={a.realisateur} />
          <DetailRow label="Projet" value={a.projet} />
          <DetailRow label="CDC" value={a.cdc} />
          <DetailRow label="Essai" value={a.essai} />
          <DetailRow label="Spécification" value={a.specification} />
          <DetailRow label="Température" value={a.temperature !== null ? `${a.temperature} °C` : null} />
          <DetailRow label="Durée prévue" value={a.duree_heures !== null ? `${a.duree_heures} h` : null} />
          <DetailRow label="Début" value={`${a.date_debut} · ${a.heure_debut}`} />
          <DetailRow label="Fin prévue" value={a.date_fin ? `${a.date_fin} · ${a.heure_fin ?? ""}` : null} />
        </div>

        {cables.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Câbles ({cables.length})
            </p>
            <div className="space-y-2">
              {cables.sort((a, b) => a.position - b.position).map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Câble #{c.position}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Type :</span> <span className="font-medium text-foreground">{c.type ?? "—"}</span></div>
                    <div><span className="text-muted-foreground">Section :</span> <span className="font-medium text-foreground">{c.section ?? "—"}</span></div>
                    <div><span className="text-muted-foreground">Couleur :</span> <span className="font-medium text-foreground">{c.couleur ?? "—"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {a.notes && (
          <div className="mt-3 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
            <p className="text-sm text-foreground">{a.notes}</p>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Fermer</Button>
          <Button
            onClick={() => endMut.mutate()}
            disabled={endMut.isPending}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {endMut.isPending ? "En cours…" : "Libérer l'étuve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
