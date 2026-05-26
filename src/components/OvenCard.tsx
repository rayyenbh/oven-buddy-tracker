import { useEffect, useState } from "react";
import type { OvenWithActive } from "@/lib/oven-queries";
import { cn } from "@/lib/utils";

function formatElapsed(startISO: string): string {
  const start = new Date(startISO).getTime();
  const diff = Math.max(0, Date.now() - start);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function OvenCard({ oven, onClick }: { oven: OvenWithActive; onClick: () => void }) {
  const isBusy = oven.active !== null;
  const [, force] = useState(0);
  useEffect(() => {
    if (!isBusy) return;
    const t = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [isBusy]);

  const startedAtISO = oven.active
    ? `${oven.active.date_debut}T${oven.active.heure_debut}`
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        isBusy ? "border-busy/40" : "border-border hover:border-accent/50",
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          isBusy ? "bg-busy" : "bg-success",
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-base font-semibold text-primary">
            {oven.internal_number}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {oven.serial_number}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            isBusy
              ? "bg-busy/10 text-busy"
              : "bg-success/10 text-success",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isBusy ? "bg-busy" : "bg-success",
            )}
          />
          {isBusy ? "En cours" : "Libre"}
        </span>
      </div>

      {isBusy && oven.active ? (
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Réalisateur</span>
            <span className="truncate font-medium">{oven.active.realisateur}</span>
          </div>
          {oven.active.projet ? (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Projet</span>
              <span className="truncate font-medium">{oven.active.projet}</span>
            </div>
          ) : null}
          {startedAtISO ? (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Durée</span>
              <span className="font-mono font-medium text-busy">
                {formatElapsed(startedAtISO)}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Cliquer pour démarrer une opération
        </div>
      )}
    </button>
  );
}
