import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchOvensWithActive, type OvenWithActive } from "@/lib/oven-queries";
import { OvenCard } from "@/components/OvenCard";
import { StartOperationDialog } from "@/components/StartOperationDialog";
import { OvenDetailsDialog } from "@/components/OvenDetailsDialog";
import { Input } from "@/components/ui/input";

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

  const counts = useMemo(() => {
    const total = data?.length ?? 0;
    const busy = data?.filter((o) => o.active).length ?? 0;
    return { total, busy, free: total - busy };
  }, [data]);

  const filtered = useMemo(() => {
    let arr = data ?? [];
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
  }, [data, filter, search]);

  const handleClick = (o: OvenWithActive) => {
    setSelected(o);
    if (o.active) setOpenDetails(true);
    else setOpenStart(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tableau des fours</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Disponibilité en temps réel des 56 fours de traitement thermique
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Total" value={counts.total} tone="primary" />
        <Stat label="Libres" value={counts.free} tone="success" />
        <Stat label="En cours" value={counts.busy} tone="busy" />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {(["all", "free", "busy"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "Tous" : f === "free" ? "Libres" : "En cours"}
            </button>
          ))}
        </div>
        <Input
          placeholder="Rechercher (RD, B621, projet, réalisateur)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((o) => (
            <OvenCard key={o.id} oven={o} onClick={() => handleClick(o)} />
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucun four ne correspond
            </div>
          ) : null}
        </div>
      )}

      <StartOperationDialog oven={selected} open={openStart} onOpenChange={setOpenStart} />
      <OvenDetailsDialog oven={selected} open={openDetails} onOpenChange={setOpenDetails} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "primary" | "success" | "busy" }) {
  const cls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-busy";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold font-mono ${cls}`}>{value}</div>
    </div>
  );
}
