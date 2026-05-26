import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Oven } from "@/lib/oven-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Fours — Administration" }] }),
});

function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Oven[]>({
    queryKey: ["ovens-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ovens").select("*").order("position");
      if (error) throw error;
      return data as Oven[];
    },
  });

  const [edits, setEdits] = useState<Record<string, { serial_number: string; internal_number: string }>>({});

  useEffect(() => {
    if (data) {
      const m: typeof edits = {};
      data.forEach((o) => { m[o.id] = { serial_number: o.serial_number, internal_number: o.internal_number }; });
      setEdits(m);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (o: Oven) => {
      const v = edits[o.id];
      if (!v.serial_number.trim() || !v.internal_number.trim()) throw new Error("Champs requis");
      const { error } = await supabase
        .from("ovens")
        .update({ serial_number: v.serial_number.trim(), internal_number: v.internal_number.trim(), updated_at: new Date().toISOString() })
        .eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Four mis à jour");
      qc.invalidateQueries({ queryKey: ["ovens-admin"] });
      qc.invalidateQueries({ queryKey: ["ovens"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Administration des fours</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifiez le numéro de série (ex: B621.0021) et le numéro interne (ex: RD 112) de chaque four.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Numéro interne</th>
              <th className="px-3 py-2.5">Numéro de série</th>
              <th className="w-24 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Chargement…</td></tr>
            ) : (
              data!.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-muted-foreground">{o.position}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="font-mono"
                      value={edits[o.id]?.internal_number ?? ""}
                      onChange={(e) => setEdits((x) => ({ ...x, [o.id]: { ...x[o.id], internal_number: e.target.value } }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="font-mono"
                      value={edits[o.id]?.serial_number ?? ""}
                      onChange={(e) => setEdits((x) => ({ ...x, [o.id]: { ...x[o.id], serial_number: e.target.value } }))}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" onClick={() => saveMut.mutate(o)} disabled={saveMut.isPending}>
                      Enregistrer
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
