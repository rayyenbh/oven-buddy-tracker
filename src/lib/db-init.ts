import { supabase } from "@/integrations/supabase/client";

let initialized = false;

export async function runDbMigrations(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const { data, error } = await (supabase as any).rpc("run_migrations");
    if (error) {
      // La fonction n'existe pas encore → migration initiale pas encore exécutée
      if (error.code === "PGRST202" || error.message?.includes("run_migrations")) {
        console.warn(
          "[ThermoTrack] La fonction run_migrations n'existe pas encore sur Supabase.\n" +
          "Exécutez le fichier supabase/migrations/20260605_features.sql une seule fois dans l'éditeur SQL Supabase."
        );
      } else {
        console.error("[ThermoTrack] Erreur migration:", error.message);
      }
      return;
    }
    const done = (data as any)?.done ?? [];
    if (done.length > 0) {
      console.info("[ThermoTrack] Migrations appliquées:", done.join(", "));
    }
  } catch (e) {
    // En cas d'erreur réseau ou autre, on laisse l'app démarrer quand même
    console.warn("[ThermoTrack] Impossible d'exécuter les migrations:", e);
  }
}
