
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oven_id UUID NOT NULL REFERENCES public.ovens(id) ON DELETE CASCADE,
  demandeur TEXT NOT NULL,
  projet TEXT,
  date_debut DATE NOT NULL,
  heure_debut TIME NOT NULL,
  date_fin DATE NOT NULL,
  heure_fin TIME NOT NULL,
  duree_heures NUMERIC,
  temperature NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resv read auth" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Resv insert auth" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Resv update auth" ON public.reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Resv delete auth" ON public.reservations FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reservations_oven ON public.reservations(oven_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(date_debut, heure_debut);
