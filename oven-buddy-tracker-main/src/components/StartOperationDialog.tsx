import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OvenWithActive } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nowHM() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const FIELDS: { name: string; label: string; required?: boolean; type?: string; placeholder?: string }[] = [
  { name: "demandeur", label: "Demandeur", required: true },
  { name: "realisateur", label: "Réalisateur", required: true },
  { name: "projet", label: "Projet" },
  { name: "cdc", label: "CDC" },
  { name: "essai", label: "Essai" },
  { name: "specification", label: "Spécification" },
  { name: "type", label: "Type de câble" },
  { name: "section", label: "Section", placeholder: "ex: 2.5 mm²" },
  { name: "couleur", label: "Couleur" },
];

export function StartOperationDialog({
  oven,
  open,
  onOpenChange,
}: {
  oven: OvenWithActive | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [dateDebut, setDateDebut] = useState(todayISO());
  const [heureDebut, setHeureDebut] = useState(nowHM());
  const [dateFin, setDateFin] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setForm({});
    setDateDebut(todayISO());
    setHeureDebut(nowHM());
    setDateFin("");
    setHeureFin("");
    setNotes("");
  };

  const startMut = useMutation({
    mutationFn: async () => {
      if (!oven) throw new Error("no oven");
      if (!form.demandeur || !form.realisateur) throw new Error("Demandeur et Réalisateur requis");
      const { error } = await supabase.from("operations").insert({
        oven_id: oven.id,
        demandeur: form.demandeur,
        realisateur: form.realisateur,
        projet: form.projet || null,
        cdc: form.cdc || null,
        essai: form.essai || null,
        specification: form.specification || null,
        date_debut: dateDebut,
        heure_debut: heureDebut,
        date_fin: dateFin || null,
        heure_fin: heureFin || null,
        type: form.type || null,
        section: form.section || null,
        couleur: form.couleur || null,
        notes: notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération démarrée");
      qc.invalidateQueries({ queryKey: ["ovens"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (!oven) return null;

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) reset(); onOpenChange(b); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-primary">{oven.internal_number}</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">{oven.serial_number}</span>
          </DialogTitle>
          <DialogDescription>Démarrer une nouvelle opération sur ce four</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>
                {f.label}{f.required ? " *" : ""}
              </Label>
              <Input
                id={f.name}
                placeholder={f.placeholder}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm((x) => ({ ...x, [f.name]: e.target.value }))}
                maxLength={200}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="dd">Date de début *</Label>
            <Input id="dd" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hd">Heure de début *</Label>
            <Input id="hd" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="df">Date de fin prévue</Label>
            <Input id="df" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hf">Heure de fin prévue</Label>
            <Input id="hf" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
            {startMut.isPending ? "..." : "Démarrer l'opération"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
