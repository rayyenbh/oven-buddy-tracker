import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchOvensWithActive, type OvenWithActive, type EquipmentKind } from "@/lib/oven-queries";
import { KIND_LABEL } from "@/lib/kind";
import { OvenCard } from "@/components/OvenCard";
import { StartOperationDialog } from "@/components/StartOperationDialog";
import { OvenDetailsDialog } from "@/components/OvenDetailsDialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Thermometer, CloudSun } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type Filter = "all" | "free" | "busy";

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ovens"],
    queryFn: fetchOvensWithActive,
    refetchInterval: 60_000,
  });

  const [kind, setKind] = useState<EquipmentKind | null>(null);
  const [selected, setSelected] = useState<OvenWithActive | null>(null);
  const [openStart, setOpenStart] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const ch = supabase
      .channel("ovens-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "operations" }, () => {
        qc.invalidateQueries({ queryKey: ["ovens"] });
        qc.invalidateQueries({ queryKey: ["history"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ovens" }, () => {
        qc.invalidateQueries({ queryKey: ["ovens"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const kindCounts = useMemo(() => {
    const arr = data ?? [];
    return {
      etuve: arr.filter((o) => o.kind === "etuve").length,
      chambre_climatique: arr.filter((o) => o.kind === "chambre_climatique").length,
    };
  }, [data]);

  const byKind = useMemo(() => (data ?? []).filter((o) => (kind ? o.kind === kind : true)), [data, kind]);

  const counts = useMemo(() => {
    const total = byKind.length;
    const busy = byKind.filter((o) => o.active).length;
    const free = total - busy;
    const utilRate = total > 0 ? Math.round((busy / total) * 100) : 0;
    return { total, busy, free, utilRate };
  }, [byKind]);

  const filtered = useMemo(() => {
    let arr = byKind;
    if (filter === "free") arr = arr.filter((o) => !o.active);
    if (filter === "busy") arr = arr.filter((o) => o.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (o) =>
          o.internal_number.toLowerCase().includes(q) ||
          o.serial_number.toLowerCase().includes(q) ||
          o.active?.projet?.toLowerCase().includes(q) ||
          o.active?.realisateur?.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [byKind, filter, search]);

  const handleClick = (o: OvenWithActive) => {
    setSelected(o);
    if (o.active) setOpenDetails(true);
    else setOpenStart(true);
  };

  // Landing selector — choose between étuves and chambres climatiques
  if (!kind) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tableau</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Que souhaitez-vous consulter&nbsp;?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choisissez le type d'équipement à suivre</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KindChoiceCard
            title="Étuves"
            subtitle="Traitement thermique"
            count={kindCounts.etuve}
            icon={<Thermometer className="h-8 w-8" />}
            accent="primary"
            onClick={() => setKind("etuve")}
          />
          <KindChoiceCard
            title="Chambres climatiques"
            subtitle="Essais climatiques"
            count={kindCounts.chambre_climatique}
            icon={<CloudSun className="h-8 w-8" />}
            accent="success"
            onClick={() => setKind("chambre_climatique")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={() => setKind(null)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Changer de type
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tableau des {KIND_LABEL[kind].toLowerCase()}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Disponibilité en temps réel · {counts.total} {KIND_LABEL[kind].toLowerCase()}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 sm:mt-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">Temps réel actif</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total étuves"
          value={counts.total}
          icon={<IconFours />}
          accent="primary"
          sub="parc complet"
        />
        <KpiCard
          label="Disponibles"
          value={counts.free}
          icon={<IconFree />}
          accent="success"
          sub="prêtes à l'emploi"
        />
        <KpiCard
          label="En opération"
          value={counts.busy}
          icon={<IconBusy />}
          accent="busy"
          sub="actives maintenant"
        />
        <KpiCard
          label="Taux d'utilisation"
          value={`${counts.utilRate}%`}
          icon={<IconRate />}
          accent="warning"
          sub="occupation globale"
          isLoading={isLoading}
        >
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-warning transition-all duration-700"
              style={{ width: `${counts.utilRate}%` }}
            />
          </div>
        </KpiCard>
      </div>

      {/* Filters + search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-card p-1 gap-1">
          {(["all", "free", "busy"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? f === "free"
                    ? "bg-success text-success-foreground shadow-sm"
                    : f === "busy"
                      ? "bg-busy text-busy-foreground shadow-sm"
                      : "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? `Toutes (${counts.total})` : f === "free" ? `Libres (${counts.free})` : `En cours (${counts.busy})`}
            </button>
          ))}
        </div>
        <div className="relative sm:max-w-xs w-full sm:w-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <Input
            placeholder="RD, B621, projet, réalisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-36 animate-shimmer rounded-xl border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((o) => (
            <OvenCard key={o.id} oven={o} onClick={() => handleClick(o)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-16 text-center">
              <svg className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-muted-foreground">Aucune étuve ne correspond à cette recherche</p>
            </div>
          )}
        </div>
      )}

      <StartOperationDialog oven={selected} open={openStart} onOpenChange={setOpenStart} />
      <OvenDetailsDialog oven={selected} open={openDetails} onOpenChange={setOpenDetails} />
    </div>
  );
}

function KpiCard({
  label, value, icon, accent, sub, isLoading, children
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: "primary" | "success" | "busy" | "warning";
  sub: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}) {
  const accentCls = {
    primary: "text-primary bg-primary/10 stat-accent-primary",
    success: "text-success bg-success/10 stat-accent-success",
    busy:    "text-busy bg-busy/10 stat-accent-busy",
    warning: "text-warning bg-warning/10 stat-accent-warning",
  }[accent];
  const valCls = {
    primary: "text-primary",
    success: "text-success",
    busy:    "text-busy",
    warning: "text-warning",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {isLoading ? (
            <div className="mt-1 h-8 w-16 animate-shimmer rounded-md" />
          ) : (
            <p className={`mt-1 text-3xl font-bold font-mono tracking-tight ${valCls}`}>{value}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentCls}`}>
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}

function IconFours() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18" strokeLinecap="round"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/></svg>;
}
function IconFree() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconBusy() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.387Z"/></svg>;
}
function IconRate() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/></svg>;
}

function KindChoiceCard({
  title, subtitle, count, icon, accent, onClick,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  accent: "primary" | "success";
  onClick: () => void;
}) {
  const accentCls = accent === "primary"
    ? "text-primary bg-primary/10 group-hover:bg-primary/20"
    : "text-success bg-success/10 group-hover:bg-success/20";
  const glow = accent === "primary" ? "group-hover:glow-primary" : "";
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-8 text-left transition-all hover:border-primary/40 hover:-translate-y-0.5 ${glow}`}
    >
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${accentCls}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-auto flex w-full items-center justify-between border-t border-border/50 pt-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Équipements</span>
        <span className="font-mono text-2xl font-bold text-foreground">{count}</span>
      </div>
    </button>
  );
}
