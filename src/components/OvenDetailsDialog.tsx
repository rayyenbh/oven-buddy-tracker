import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OvenWithActive } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
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
      toast.success("Opération terminée — four libéré");
      qc.invalidateQueries({ queryKey: ["ovens"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (!oven || !oven.active) return null;
  const a = oven.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-primary">{oven.internal_number}</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">{oven.serial_number}</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-busy/10 px-2 py-0.5 text-xs font-medium text-busy">
              <span className="h-1.5 w-1.5 rounded-full bg-busy" /> En cours
            </span>
          </DialogTitle>
          <DialogDescription>Opération en cours sur ce four</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Row label="Demandeur" value={a.demandeur} />
          <Row label="Réalisateur" value={a.realisateur} />
          <Row label="Projet" value={a.projet} />
          <Row label="CDC" value={a.cdc} />
          <Row label="Essai" value={a.essai} />
          <Row label="Spécification" value={a.specification} />
          <Row label="Type" value={a.type} />
          <Row label="Section" value={a.section} />
          <Row label="Couleur" value={a.couleur} />
          <Row label="Début" value={`${a.date_debut} ${a.heure_debut}`} />
          <Row label="Fin prévue" value={a.date_fin ? `${a.date_fin} ${a.heure_fin ?? ""}` : "—"} />
          {a.notes ? <Row label="Notes" value={a.notes} /> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={() => endMut.mutate()} disabled={endMut.isPending}>
            {endMut.isPending ? "..." : "Libérer le four"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
