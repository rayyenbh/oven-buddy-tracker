-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : nouvelles fonctionnalités ThermoTrack
--   1. Colonnes temperature + cables_json sur operations
--   2. Table chambres_climatiques
--   3. Table operations_chambres (même structure que operations)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonnes supplémentaires sur operations
ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS temperature TEXT,
  ADD COLUMN IF NOT EXISTS cables_json TEXT;

-- 2. Table chambres_climatiques
CREATE TABLE IF NOT EXISTS chambres_climatiques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_number TEXT NOT NULL,
  serial_number   TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table operations_chambres
CREATE TABLE IF NOT EXISTS operations_chambres (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chambre_id     UUID NOT NULL REFERENCES chambres_climatiques(id) ON DELETE CASCADE,
  demandeur      TEXT NOT NULL,
  realisateur    TEXT NOT NULL,
  projet         TEXT,
  cdc            TEXT,
  essai          TEXT,
  specification  TEXT,
  temperature    TEXT,
  date_debut     DATE NOT NULL,
  heure_debut    TIME NOT NULL,
  date_fin       DATE,
  heure_fin      TIME,
  type           TEXT,
  section        TEXT,
  couleur        TEXT,
  cables_json    TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_operations_chambres_chambre_id ON operations_chambres(chambre_id);
CREATE INDEX IF NOT EXISTS idx_operations_chambres_status     ON operations_chambres(status);
CREATE INDEX IF NOT EXISTS idx_operations_chambres_created_at ON operations_chambres(created_at DESC);

-- RLS : accès public (même politique que operations existantes)
ALTER TABLE chambres_climatiques  ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_chambres   ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all on chambres_climatiques"  ON chambres_climatiques  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on operations_chambres"   ON operations_chambres   FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chambres_climatiques;
ALTER PUBLICATION supabase_realtime ADD TABLE operations_chambres;
