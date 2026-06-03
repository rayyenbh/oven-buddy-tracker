import { supabase } from "@/integrations/supabase/client";
import { cacheData, getCachedData, isOnline } from "./offline-db";

export type Oven = {
  id: string;
  position: number;
  serial_number: string;
  internal_number: string;
};

export type Cable = {
  id: string;
  operation_id: string;
  position: number;
  type: string | null;
  section: string | null;
  couleur: string | null;
};

export type Operation = {
  id: string;
  oven_id: string;
  demandeur: string;
  realisateur: string;
  projet: string | null;
  cdc: string | null;
  essai: string | null;
  specification: string | null;
  date_debut: string;
  heure_debut: string;
  date_fin: string | null;
  heure_fin: string | null;
  type: string | null;
  section: string | null;
  couleur: string | null;
  temperature: number | null;
  duree_heures: number | null;
  status: "active" | "completed";
  notes: string | null;
  created_at: string;
  ended_at: string | null;
};

export type OvenWithActive = Oven & { active: (Operation & { cables: Cable[] }) | null };

export type Reservation = {
  id: string;
  oven_id: string;
  demandeur: string;
  projet: string | null;
  date_debut: string;
  heure_debut: string;
  date_fin: string;
  heure_fin: string;
  duree_heures: number | null;
  temperature: number | null;
  notes: string | null;
  created_at: string;
};

export type ReservationWithOven = Reservation & { oven: Oven };

export async function fetchOvensWithActive(): Promise<OvenWithActive[]> {
  if (!isOnline()) {
    return getCachedData<OvenWithActive>("ovens");
  }
  const [{ data: ovens, error: oErr }, { data: ops, error: opErr }] = await Promise.all([
    supabase.from("ovens").select("*").order("position", { ascending: true }),
    supabase.from("operations").select("*, cables:operation_cables(*)").eq("status", "active"),
  ]);
  if (oErr) throw oErr;
  if (opErr) throw opErr;
  const byOven = new Map<string, Operation & { cables: Cable[] }>();
  (ops ?? []).forEach((o: any) => byOven.set(o.oven_id, o));
  const result = (ovens ?? []).map((o) => ({ ...(o as Oven), active: byOven.get(o.id) ?? null }));
  cacheData("ovens", result).catch(() => {});
  return result;
}

export async function fetchHistory(): Promise<(Operation & { oven: Oven; cables: Cable[] })[]> {
  if (!isOnline()) {
    return getCachedData<Operation & { oven: Oven; cables: Cable[] }>("history");
  }
  const { data, error } = await supabase
    .from("operations")
    .select("*, oven:ovens(*), cables:operation_cables(*)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const result = (data ?? []) as any;
  cacheData("history", result).catch(() => {});
  return result;
}

export async function fetchReservations(): Promise<ReservationWithOven[]> {
  if (!isOnline()) {
    return getCachedData<ReservationWithOven>("reservations");
  }
  const { data, error } = await supabase
    .from("reservations")
    .select("*, oven:ovens(*)")
    .order("date_debut", { ascending: true })
    .order("heure_debut", { ascending: true });
  if (error) throw error;
  const result = (data ?? []) as any;
  cacheData("reservations", result).catch(() => {});
  return result;
}

export async function createReservation(payload: Omit<Reservation, "id" | "created_at">): Promise<void> {
  const { error } = await supabase.from("reservations").insert(payload as any);
  if (error) throw error;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw error;
}

export type StatsOperation = {
  id: string;
  oven_id: string;
  date_debut: string;
  heure_debut: string;
  date_fin: string | null;
  heure_fin: string | null;
  status: "active" | "completed";
  ended_at: string | null;
  created_at: string;
  oven: { id: string; internal_number: string; serial_number: string };
};

export async function fetchStats(): Promise<StatsOperation[]> {
  const { data, error } = await supabase
    .from("operations")
    .select("id, oven_id, date_debut, heure_debut, date_fin, heure_fin, status, ended_at, created_at, oven:ovens(id, internal_number, serial_number)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

/** Add `hours` (decimal allowed) to a date+time string. Returns { date, time } in ISO format. */
export function addHoursToDateTime(dateISO: string, timeHM: string, hours: number): { date: string; time: string } {
  const start = new Date(`${dateISO}T${timeHM}:00`);
  const end = new Date(start.getTime() + hours * 3_600_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}
