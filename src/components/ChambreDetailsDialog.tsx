import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChambreWithActive } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import React from "react";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function ElapsedTimer({ startISO }: { startISO: string }) {
  const [elapsed, setElapsed] = React.useState(() => {
    const diff = Math.max(0, Date.now() - new Date(startISO).getTime());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  });
  React.useEffect(() => {
    const t = setInterval(() => {
      const diff = Math.max(0, Date.now() - new Date(startISO).getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setElapsed(`${h}h ${m.toString().padStart(2, "0")}m`);
    }, 30_000);
    return () => clearInterval(t);
  }, [startISO]);
  return <span className="font-mono font-bold text-busy tabular-nums">{elapsed}</span>;
}

type CableRow = { type?: string; section?: string; couleur?: string; quantite?: string };

function parseCables(raw: string | null): CableRow[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as CableRow[]; } catch { return []; }
}

export function ChambreDetailsDialog({
  chambre,
  open,
  onOpenChange,
}: {
  chambre: ChambreWithActive | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();

  const endMut = useMutation({
    mutationFn: async () => {
      if (!chambre?.active) throw new Error("no active");
      const now = new Date();
      const { error } = await supabase
        .from("operations_chambres")
        .update({
          status: "completed",
          ended_at: now.toISOString(),
          date_fin: chambre.active.date_fin ?? now.toISOString().slice(0, 10),
          heure_fin: chambre.active.heure_fin ?? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
        })
        .eq("id", chambre.active.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération terminée — chambre libérée");
      qc.invalidateQueries({ queryKey: ["chambres"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (!chambre || !chambre.active) return null;
  const a = chambre.active;
  const startISO = `${a.date_debut}T${a.heure_debut}`;
  const cables = parseCables((a as any).cables_json);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-busy/15 shrink-0">
              <svg className="h-5 w-5 text-busy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-foreground">{chambre.internal_number}</span>
                <span className="font-mono text-sm font-normal text-muted-foreground">{chambre.serial_number}</span>
                <span className="text-[10px] rounded-full bg-primary/15 px-2 py-0.5 text-primary font-semibold">Chambre climatique</span>
              </DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-busy/15 px-2 py-0.5 text-xs font-semibold text-busy">
                  <span className="h-1.5 w-1.5 rounded-full bg-busy animate-pulse-dot" />
                  En opération
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
          {(a as any).temperature && (
            <DetailRow label="Température" value={`${(a as any).temperature} °C`} />
          )}
          <DetailRow label="Début" value={`${a.date_debut} · ${a.heure_debut}`} />
          <DetailRow label="Fin prévue" value={a.date_fin ? `${a.date_fin} · ${a.heure_fin ?? ""}` : null} />

          {cables.length > 0 ? (
            <div className="py-2.5 border-t border-border/50">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Câbles associés</p>
              <div className="space-y-1.5">
                {cables.map((c, i) => (
                  <div key={i} className="flex flex-wrap gap-2 text-xs">
                    {c.type && <span className="rounded bg-busy/10 px-2 py-0.5 font-mono text-busy">{c.type}</span>}
                    {c.section && <span className="rounded bg-secondary px-2 py-0.5 font-mono text-foreground">{c.section}</span>}
                    {c.couleur && <span className="rounded bg-secondary px-2 py-0.5 text-foreground">{c.couleur}</span>}
                    {c.quantite && <span className="rounded bg-secondary px-2 py-0.5 text-muted-foreground">{c.quantite}</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (a.type || a.section || a.couleur) ? (
            <div className="py-2.5 border-t border-border/50">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Câble</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {a.type && <span className="rounded bg-busy/10 px-2 py-0.5 font-mono text-busy">{a.type}</span>}
                {a.section && <span className="rounded bg-secondary px-2 py-0.5 font-mono text-foreground">{a.section}</span>}
                {a.couleur && <span className="rounded bg-secondary px-2 py-0.5 text-foreground">{a.couleur}</span>}
              </div>
            </div>
          ) : null}

          {a.notes && (
            <div className="py-2.5 border-t border-border/50">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
              <p className="text-sm text-foreground">{a.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Fermer</Button>
          <Button
            onClick={() => endMut.mutate()}
            disabled={endMut.isPending}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {endMut.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                En cours…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Libérer la chambre
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
