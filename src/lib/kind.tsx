import type { EquipmentKind } from "./oven-queries";

export type KindFilter = "all" | EquipmentKind;

export const KIND_LABEL: Record<EquipmentKind, string> = {
  etuve: "Étuves",
  chambre_climatique: "Chambres climatiques",
};

export const KIND_LABEL_SINGULAR: Record<EquipmentKind, string> = {
  etuve: "Étuve",
  chambre_climatique: "Chambre climatique",
};

/** Filter tabs shown at the top of Historique / Stats / Planification / Admin. */
export function KindTabs({
  value,
  onChange,
  counts,
}: {
  value: KindFilter;
  onChange: (v: KindFilter) => void;
  counts?: { all?: number; etuve?: number; chambre_climatique?: number };
}) {
  const items: { key: KindFilter; label: string; count?: number }[] = [
    { key: "all", label: "Tous", count: counts?.all },
    { key: "etuve", label: "Étuves", count: counts?.etuve },
    { key: "chambre_climatique", label: "Chambres climatiques", count: counts?.chambre_climatique },
  ];
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-border bg-card p-1 gap-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            value === it.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {it.label}
          {typeof it.count === "number" && (
            <span className="ml-1.5 opacity-70 font-mono text-xs">({it.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
