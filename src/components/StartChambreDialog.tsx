import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChambreWithActive } from "@/lib/oven-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowHM() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function addHoursToDateTime(date: string, time: string, hours: number) {
  if (!date || !time || hours <= 0) return { date: "", time: "" };
  try {
    const end = new Date(new Date(`${date}T${time}`).getTime() + hours * 3_600_000);
    return {
      date: end.toISOString().slice(0, 10),
      time: `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`,
    };
  } catch { return { date: "", time: "" }; }
}

function computeDuration(d1: string, h1: string, d2: string, h2: string): string {
  if (!d1 || !h1 || !d2 || !h2) return "";
  try {
    const diff = new Date(`${d2}T${h2}`).getTime() - new Date(`${d1}T${h1}`).getTime();
    if (diff <= 0) return "—";
    const totalMin = Math.floor(diff / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  } catch { return ""; }
}

function FloatInput({ label, required, placeholder, value, onChange, type = "text" }: {
  label: string; required?: boolean; placeholder?: string;
  value: string; onChange: (v: string) => void; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative">
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ""} maxLength={200}
        className={`peer w-full rounded-xl border bg-secondary/30 px-3 pt-5 pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all
          ${focused || filled ? "border-primary/60 ring-2 ring-primary/15" : "border-border hover:border-border/80"}`}
      />
      <label className={`pointer-events-none absolute left-3 font-medium transition-all duration-150
        ${focused || filled ? "top-1.5 text-[10px] uppercase tracking-wider text-primary" : "top-3.5 text-sm text-muted-foreground"}`}>
        {label}{required && <span className="ml-0.5 text-busy">*</span>}
      </label>
    </div>
  );
}

function DateTimeField({ label, required, type, value, onChange }: {
  label: string; required?: boolean; type: "date" | "time"; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="peer w-full rounded-xl border border-border bg-secondary/30 px-3 pt-5 pb-2 text-sm text-foreground outline-none transition-all hover:border-border/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
      />
      <label className="pointer-events-none absolute left-3 top-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
        {label}{required && <span className="ml-0.5 text-busy">*</span>}
      </label>
    </div>
  );
}

type CableRow = { type: string; section: string; couleur: string; quantite: string };
const emptyCable = (): CableRow => ({ type: "", section: "", couleur: "", quantite: "" });

function SectionCard({ icon, title, color, children }: {
  icon: React.ReactNode; title: string;
  color: "primary" | "warning" | "busy" | "success"; children: React.ReactNode;
}) {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
    warning: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
    busy:    { bg: "bg-busy/10",    text: "text-busy",    border: "border-busy/20" },
    success: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  }[color];
  return (
    <div className={`rounded-xl border ${colorMap.border} bg-secondary/10 overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${colorMap.bg} border-b ${colorMap.border}`}>
        <span className={colorMap.text}>{icon}</span>
        <h3 className={`text-[11px] font-bold uppercase tracking-widest ${colorMap.text}`}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StartChambreDialog({
  chambre, open, onOpenChange,
}: {
  chambre: ChambreWithActive | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [dateDebut, setDateDebut] = useState(todayISO());
  const [heureDebut, setHeureDebut] = useState(nowHM());
  const [dateFin, setDateFin] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [temperature, setTemperature] = useState("");
  const [cables, setCables] = useState<CableRow[]>([emptyCable()]);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setForm({}); setDateDebut(todayISO()); setHeureDebut(nowHM());
    setDateFin(""); setHeureFin(""); setDurationHours("");
    setTemperature(""); setCables([emptyCable()]); setNotes("");
  };

  const handleDurationChange = (v: string) => {
    setDurationHours(v);
    const h = parseFloat(v);
    if (!isNaN(h) && h > 0) {
      const { date, time } = addHoursToDateTime(dateDebut, heureDebut, h);
      setDateFin(date); setHeureFin(time);
    } else { setDateFin(""); setHeureFin(""); }
  };

  const handleStartChange = (date: string, time: string) => {
    const h = parseFloat(durationHours);
    if (!isNaN(h) && h > 0) {
      const { date: d, time: t } = addHoursToDateTime(date, time, h);
      setDateFin(d); setHeureFin(t);
    }
  };

  const addCable = () => setCables((c) => [...c, emptyCable()]);
  const removeCable = (i: number) => setCables((c) => c.filter((_, idx) => idx !== i));
  const updateCable = (i: number, field: keyof CableRow, val: string) =>
    setCables((c) => c.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const startMut = useMutation({
    mutationFn: async () => {
      if (!chambre) throw new Error("no chambre");
      if (!form.demandeur?.trim() || !form.realisateur?.trim())
        throw new Error("Demandeur et Réalisateur sont requis");
      const validCables = cables.filter((c) => c.type.trim() || c.section.trim() || c.couleur.trim());
      const { error } = await supabase.from("operations_chambres").insert({
        chambre_id:    chambre.id,
        demandeur:     form.demandeur,
        realisateur:   form.realisateur,
        projet:        form.projet || null,
        cdc:           form.cdc || null,
        essai:         form.essai || null,
        specification: form.specification || null,
        temperature:   temperature || null,
        date_debut:    dateDebut,
        heure_debut:   heureDebut,
        date_fin:      dateFin || null,
        heure_fin:     heureFin || null,
        type:          validCables[0]?.type || null,
        section:       validCables[0]?.section || null,
        couleur:       validCables[0]?.couleur || null,
        cables_json:   validCables.length > 0 ? JSON.stringify(validCables) : null,
        notes:         notes || null,
        status:        "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération démarrée sur la chambre climatique");
      qc.invalidateQueries({ queryKey: ["chambres"] });
      reset(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (!chambre) return null;
  const set = (name: string) => (v: string) => setForm((x) => ({ ...x, [name]: v }));
  const get = (name: string) => form[name] ?? "";

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) reset(); onOpenChange(b); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-border bg-card gap-0">

        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-6 pb-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 ring-1 ring-primary/30 shadow-lg">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                  <span className="font-mono text-lg font-bold text-primary">{chambre.internal_number}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary/80 ring-1 ring-primary/20">
                    {chambre.serial_number}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                  Nouvelle opération — Chambre climatique
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">

          <SectionCard icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>}
            title="Intervenants" color="primary">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FloatInput label="Demandeur" required placeholder="Nom du demandeur" value={get("demandeur")} onChange={set("demandeur")} />
              <FloatInput label="Réalisateur" required placeholder="Nom du réalisateur" value={get("realisateur")} onChange={set("realisateur")} />
            </div>
          </SectionCard>

          <SectionCard icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>}
            title="Identifiants projet" color="warning">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FloatInput label="Projet" placeholder="Référence projet" value={get("projet")} onChange={set("projet")} />
              <FloatInput label="CDC" placeholder="Cahier des charges" value={get("cdc")} onChange={set("cdc")} />
              <FloatInput label="Essai" placeholder="N° essai" value={get("essai")} onChange={set("essai")} />
              <FloatInput label="Spécification" placeholder="Norme / spec" value={get("specification")} onChange={set("specification")} />
            </div>
          </SectionCard>

          <SectionCard icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>}
            title="Câbles associés" color="busy">
            <div className="space-y-2">
              {cables.map((cable, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                    <FloatInput label="Type" placeholder="NYY…" value={cable.type} onChange={(v) => updateCable(i, "type", v)} />
                    <FloatInput label="Section" placeholder="2.5 mm²" value={cable.section} onChange={(v) => updateCable(i, "section", v)} />
                    <FloatInput label="Couleur" placeholder="Rouge…" value={cable.couleur} onChange={(v) => updateCable(i, "couleur", v)} />
                    <FloatInput label="Quantité" placeholder="ex: 50m" value={cable.quantite} onChange={(v) => updateCable(i, "quantite", v)} />
                  </div>
                  {cables.length > 1 && (
                    <button onClick={() => removeCable(i)} className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addCable} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-1">
                <Plus className="h-3.5 w-3.5" /> Ajouter un câble
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.387Z"/></svg>}
            title="Température" color="success">
            <div className="max-w-xs">
              <FloatInput label="Température (°C)" placeholder="ex: -20 ou 85" type="number" value={temperature} onChange={setTemperature} />
            </div>
          </SectionCard>

          <SectionCard icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/></svg>}
            title="Planning" color="primary">
            <div className="space-y-3">
              <div className="relative max-w-xs">
                <input type="number" min="0" step="0.5" value={durationHours}
                  onChange={(e) => handleDurationChange(e.target.value)} placeholder="ex: 100"
                  className="w-full rounded-xl border border-border bg-secondary/30 px-3 pt-5 pb-2 text-sm text-foreground outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                />
                <label className="pointer-events-none absolute left-3 top-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  Durée prévue (heures)
                </label>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground mt-1">h</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DateTimeField label="Date début" required type="date" value={dateDebut}
                  onChange={(v) => { setDateDebut(v); handleStartChange(v, heureDebut); }} />
                <DateTimeField label="Heure début" required type="time" value={heureDebut}
                  onChange={(v) => { setHeureDebut(v); handleStartChange(dateDebut, v); }} />
                <DateTimeField label="Date fin prévue" type="date" value={dateFin} onChange={setDateFin} />
                <DateTimeField label="Heure fin prévue" type="time" value={heureFin} onChange={setHeureFin} />
              </div>
              {dateFin && heureFin && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg className="h-3.5 w-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Durée prévue : <span className="font-medium text-foreground font-mono">{computeDuration(dateDebut, heureDebut, dateFin, heureFin)}</span>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="relative">
            <Textarea rows={3} placeholder="Observations…" value={notes}
              onChange={(e) => setNotes(e.target.value)} maxLength={1000}
              className="resize-none rounded-xl border-border bg-secondary/30 pt-7 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
            />
            <label className="pointer-events-none absolute left-3 top-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">{notes.length}/1000</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/20 px-6 py-4">
          <p className="text-xs text-muted-foreground"><span className="text-busy">*</span> Champs obligatoires</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">Annuler</Button>
            <Button onClick={() => startMut.mutate()} disabled={startMut.isPending} className="gap-2 glow-primary min-w-[160px]">
              {startMut.isPending ? (
                <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Démarrage…</>
              ) : (
                <><svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"/></svg> Démarrer l'opération</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
