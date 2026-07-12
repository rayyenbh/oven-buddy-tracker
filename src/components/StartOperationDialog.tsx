import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type OvenWithActive, addHoursToDateTime, findOvenScheduleConflicts } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowHM() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

type CableInput = { type: string; section: string; couleur: string };

const emptyCable = (): CableInput => ({ type: "", section: "", couleur: "" });

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
  const { fullName, isAdmin } = useAuth();

  const [demandeur, setDemandeur] = useState("");
  const [realisateur, setRealisateur] = useState("");
  const [projet, setProjet] = useState("");
  const [cdc, setCdc] = useState("");
  const [essai, setEssai] = useState("");
  const [specification, setSpecification] = useState("");
  const [temperature, setTemperature] = useState("");
  const [dateDebut, setDateDebut] = useState(todayISO());
  const [heureDebut, setHeureDebut] = useState(nowHM());
  const [endMode, setEndMode] = useState<"duree" | "manuel">("duree");
  const [dureeHeures, setDureeHeures] = useState("");
  const [dateFinManuel, setDateFinManuel] = useState("");
  const [heureFinManuel, setHeureFinManuel] = useState("");
  const [notes, setNotes] = useState("");
  const [cables, setCables] = useState<CableInput[]>([emptyCable()]);

  // Lock the connected user's own field: admin => demandeur, opérateur => réalisateur.
  // The other field is left for the user to fill in (or edit, for an admin's réalisateur default).
  useEffect(() => {
    if (!open || !fullName) return;
    if (isAdmin) {
      setDemandeur(fullName);
      setRealisateur((v) => v || fullName);
    } else {
      setRealisateur(fullName);
    }
  }, [open, fullName, isAdmin]);

  const computedEnd = useMemo(() => {
    if (endMode === "manuel") {
      if (!dateFinManuel || !heureFinManuel) return null;
      // sanity check: end > start
      const start = new Date(`${dateDebut}T${heureDebut}:00`);
      const end = new Date(`${dateFinManuel}T${heureFinManuel}:00`);
      if (!(end.getTime() > start.getTime())) return null;
      return { date: dateFinManuel, time: heureFinManuel };
    }
    const h = parseFloat(dureeHeures);
    if (!dateDebut || !heureDebut || !dureeHeures || isNaN(h) || h <= 0) return null;
    return addHoursToDateTime(dateDebut, heureDebut, h);
  }, [endMode, dateDebut, heureDebut, dureeHeures, dateFinManuel, heureFinManuel]);

  const reset = () => {
    setDemandeur(isAdmin ? (fullName || "") : "");
    setRealisateur(fullName || ""); setProjet(""); setCdc(""); setEssai("");
    setSpecification(""); setTemperature("");
    setDateDebut(todayISO()); setHeureDebut(nowHM());
    setEndMode("duree"); setDureeHeures("");
    setDateFinManuel(""); setHeureFinManuel("");
    setNotes(""); setCables([emptyCable()]);
  };

  const validate = (): string | null => {
    if (!oven) return "Aucune étuve sélectionnée";
    if (!demandeur.trim()) return "Demandeur requis";
    if (!realisateur.trim()) return "Réalisateur requis";
    if (!projet.trim()) return "Projet requis";
    if (!cdc.trim()) return "CDC requis";
    if (!essai.trim()) return "Essai requis";
    if (!specification.trim()) return "Spécification requise";
    const t = parseFloat(temperature);
    if (!temperature.trim() || isNaN(t)) return "Température requise (en °C)";
    if (!dateDebut) return "Date de début requise";
    if (!heureDebut) return "Heure de début requise";
    if (endMode === "duree") {
      const h = parseFloat(dureeHeures);
      if (!dureeHeures.trim() || isNaN(h) || h <= 0) return "Durée (heures) requise et > 0";
    } else {
      if (!dateFinManuel) return "Date de fin requise";
      if (!heureFinManuel) return "Heure de fin requise";
      const start = new Date(`${dateDebut}T${heureDebut}:00`);
      const end = new Date(`${dateFinManuel}T${heureFinManuel}:00`);
      if (!(end.getTime() > start.getTime())) return "La fin doit être après le début";
    }
    if (cables.length === 0) return "Au moins un câble est requis";
    for (let i = 0; i < cables.length; i++) {
      const c = cables[i];
      if (!c.type.trim() || !c.section.trim() || !c.couleur.trim())
        return `Câble #${i + 1} : type, section et couleur sont requis`;
    }
    return null;
  };

  const startMut = useMutation({
    mutationFn: async () => {
      const err = validate();
      if (err) throw new Error(err);
      const end = computedEnd!;
      const startMs = new Date(`${dateDebut}T${heureDebut}:00`).getTime();
      const endMs = new Date(`${end.date}T${end.time}:00`).getTime();
      const durationHours = endMode === "duree" ? parseFloat(dureeHeures) : (endMs - startMs) / 3_600_000;
      const conflicts = await findOvenScheduleConflicts({
        ovenId: oven!.id,
        startDate: dateDebut,
        startTime: heureDebut,
        endDate: end.date,
        endTime: end.time,
      });
      if (conflicts.length > 0) {
        throw new Error("Conflit de planning : une autre opération ou réservation est déjà prévue sur cette étuve pendant cette plage." );
      }
      const { data: op, error: oErr } = await supabase.from("operations").insert({
        oven_id: oven!.id,
        demandeur: demandeur.trim(),
        realisateur: realisateur.trim(),
        projet: projet.trim(),
        cdc: cdc.trim(),
        essai: essai.trim(),
        specification: specification.trim(),
        temperature: parseFloat(temperature),
        duree_heures: Math.round(durationHours * 100) / 100,
        date_debut: dateDebut,
        heure_debut: heureDebut,
        date_fin: end.date,
        heure_fin: end.time,
        notes: notes.trim() || null,
        status: "active",
      }).select("id").single();
      if (oErr) throw oErr;
      const { error: cErr } = await supabase.from("operation_cables").insert(
        cables.map((c, i) => ({
          operation_id: op!.id,
          position: i + 1,
          type: c.type.trim(),
          section: c.section.trim(),
          couleur: c.couleur.trim(),
        }))
      );
      if (cErr) throw cErr;
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

  const updateCable = (i: number, field: keyof CableInput, v: string) => {
    setCables((arr) => arr.map((c, idx) => idx === i ? { ...c, [field]: v } : c));
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) reset(); onOpenChange(b); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-border bg-card gap-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-6 pb-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30 shadow-lg">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18" strokeLinecap="round" />
                  <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                  <span className="font-mono text-lg font-bold text-primary">{oven.internal_number}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary/80 ring-1 ring-primary/20">
                    {oven.serial_number}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                  Nouvelle opération de traitement thermique sur cette étuve
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">

          {/* Intervenants */}
          <Section title="Intervenants" color="primary">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Demandeur" required value={demandeur} onChange={setDemandeur} placeholder="Nom du demandeur" readOnly={isAdmin} />
              <Field label="Réalisateur" required value={realisateur} onChange={setRealisateur} placeholder="Nom du réalisateur" readOnly={!isAdmin} />
            </div>
          </Section>

          {/* Projet */}
          <Section title="Identifiants projet" color="warning">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Projet" required value={projet} onChange={setProjet} placeholder="Référence projet" />
              <Field label="CDC" required value={cdc} onChange={setCdc} placeholder="Cahier des charges" />
              <Field label="Essai" required value={essai} onChange={setEssai} placeholder="N° essai" />
              <Field label="Spécification" required value={specification} onChange={setSpecification} placeholder="Norme / spec" />
            </div>
          </Section>

          {/* Paramètres étuve */}
          <Section title="Paramètres de l'étuve" color="busy">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Température (°C)" required type="number" step="0.1"
                value={temperature} onChange={setTemperature} placeholder="ex: 180"
              />
            </div>
          </Section>

          {/* Câbles */}
          <Section
            title="Caractéristiques câbles"
            color="busy"
            action={
              <Button
                type="button" size="sm" variant="outline"
                className="h-7 gap-1 border-border text-xs"
                onClick={() => setCables((c) => [...c, emptyCable()])}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un câble
              </Button>
            }
          >
            <div className="space-y-3">
              {cables.map((cable, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Câble #{i + 1}
                    </span>
                    {cables.length > 1 && (
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setCables((c) => c.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Field label="Type" required value={cable.type} onChange={(v) => updateCable(i, "type", v)} placeholder="NYY, H07V-R…" />
                    <Field label="Section" required value={cable.section} onChange={(v) => updateCable(i, "section", v)} placeholder="2.5 mm²" />
                    <Field label="Couleur" required value={cable.couleur} onChange={(v) => updateCable(i, "couleur", v)} placeholder="Rouge, Bleu…" />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Planning */}
          <Section title="Planning" color="success">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Date début" required type="date" value={dateDebut} onChange={setDateDebut} />
              <Field label="Heure début" required type="time" value={heureDebut} onChange={setHeureDebut} />
            </div>

            <div className="mt-4">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Définir la fin par
              </Label>
              <div className="mt-1.5 inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 gap-0.5">
                {(["duree", "manuel"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEndMode(m)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      endMode === m
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "duree" ? "Durée (heures)" : "Date & heure de fin"}
                  </button>
                ))}
              </div>
            </div>

            {endMode === "duree" ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Durée (heures)" required type="number" step="0.5"
                  value={dureeHeures} onChange={setDureeHeures} placeholder="ex: 2.5"
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Date fin" required type="date" value={dateFinManuel} onChange={setDateFinManuel} />
                <Field label="Heure fin" required type="time" value={heureFinManuel} onChange={setHeureFinManuel} />
              </div>
            )}

            {computedEnd && (
              <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-success">
                  {endMode === "duree" ? "Fin calculée automatiquement" : "Fin enregistrée"}
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium text-foreground">
                  {computedEnd.date} · {computedEnd.time}
                </p>
              </div>
            )}
          </Section>


          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Notes</Label>
            <Textarea
              rows={3}
              placeholder="Observations, consignes particulières…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              className="resize-none rounded-xl border-border bg-secondary/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/20 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-busy">*</span> Tous les champs sont obligatoires
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
              className="gap-2 glow-primary min-w-[180px]"
            >
              {startMut.isPending ? "Démarrage…" : "Démarrer l'opération"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title, color, action, children,
}: {
  title: string;
  color: "primary" | "warning" | "busy" | "success";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const map = {
    primary: { bg: "bg-primary/10",  text: "text-primary",  border: "border-primary/20" },
    warning: { bg: "bg-warning/10",  text: "text-warning",  border: "border-warning/20" },
    busy:    { bg: "bg-busy/10",     text: "text-busy",     border: "border-busy/20" },
    success: { bg: "bg-success/10",  text: "text-success",  border: "border-success/20" },
  }[color];
  return (
    <div className={`rounded-xl border ${map.border} bg-secondary/10 overflow-hidden`}>
      <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${map.bg} border-b ${map.border}`}>
        <h3 className={`text-[11px] font-bold uppercase tracking-widest ${map.text}`}>{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label, required, type = "text", value, onChange, placeholder, step, readOnly = false,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-busy">*</span>}
      </Label>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={type === "text" ? 200 : undefined}
        className={`bg-secondary/30 border-border ${readOnly ? "bg-secondary/20 opacity-90" : ""}`}
      />
    </div>
  );
}
