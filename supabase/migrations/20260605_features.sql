-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : nouvelles fonctionnalités ThermoTrack
-- Exécutez ce fichier UNE SEULE FOIS dans l'éditeur SQL Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonnes supplémentaires sur operations
ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS temperature TEXT,
  ADD COLUMN IF NOT EXISTS cables_json TEXT;

-- 2. Table app_users (gestion des utilisateurs de l'application)
CREATE TABLE IF NOT EXISTS app_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'technicien'
                    CHECK (role IN ('admin', 'technicien')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertion des comptes par défaut (ignorée si déjà présents)
INSERT INTO app_users (username, password_hash, role) VALUES
  ('admin',      'admin',   'admin'),
  ('technicien', 'tech123', 'technicien')
ON CONFLICT (username) DO NOTHING;

-- RLS sur app_users
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='Open all app_users') THEN
    CREATE POLICY "Open all app_users" ON app_users
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_users TO anon, authenticated;

-- 3. Table chambres_climatiques
CREATE TABLE IF NOT EXISTS chambres_climatiques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_number TEXT NOT NULL,
  serial_number   TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table operations_chambres
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

CREATE INDEX IF NOT EXISTS idx_operations_chambres_chambre_id ON operations_chambres(chambre_id);
CREATE INDEX IF NOT EXISTS idx_operations_chambres_status     ON operations_chambres(status);
CREATE INDEX IF NOT EXISTS idx_operations_chambres_created_at ON operations_chambres(created_at DESC);

-- RLS
ALTER TABLE chambres_climatiques  ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_chambres   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chambres_climatiques' AND policyname='Open all chambres') THEN
    CREATE POLICY "Open all chambres" ON chambres_climatiques
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operations_chambres' AND policyname='Open all operations_chambres') THEN
    CREATE POLICY "Open all operations_chambres" ON operations_chambres
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON chambres_climatiques TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_chambres  TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE chambres_climatiques;
ALTER PUBLICATION supabase_realtime ADD TABLE operations_chambres;
ALTER TABLE chambres_climatiques REPLICA IDENTITY FULL;
ALTER TABLE operations_chambres  REPLICA IDENTITY FULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fonction RPC run_migrations() — appelée automatiquement par l'app
-- Crée les tables/colonnes manquantes sans service_role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION run_migrations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  done_list text[] := '{}';
BEGIN
  -- operations.temperature
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operations' AND column_name='temperature') THEN
    ALTER TABLE operations ADD COLUMN temperature TEXT;
    done_list := array_append(done_list, 'operations.temperature');
  END IF;

  -- operations.cables_json
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operations' AND column_name='cables_json') THEN
    ALTER TABLE operations ADD COLUMN cables_json TEXT;
    done_list := array_append(done_list, 'operations.cables_json');
  END IF;

  -- table app_users
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='app_users') THEN
    CREATE TABLE app_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'technicien' CHECK (role IN ('admin','technicien')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Open all app_users" ON app_users
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON app_users TO anon, authenticated;
    -- Comptes par défaut
    INSERT INTO app_users (username, password_hash, role) VALUES
      ('admin',      'admin',   'admin'),
      ('technicien', 'tech123', 'technicien');
    done_list := array_append(done_list, 'table:app_users');
  ELSE
    -- S'assure que le compte admin existe toujours
    INSERT INTO app_users (username, password_hash, role)
    VALUES ('admin', 'admin', 'admin')
    ON CONFLICT (username) DO NOTHING;
  END IF;

  -- table chambres_climatiques
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chambres_climatiques') THEN
    CREATE TABLE chambres_climatiques (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      internal_number TEXT NOT NULL,
      serial_number   TEXT NOT NULL,
      position        INTEGER NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE chambres_climatiques ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Open all chambres" ON chambres_climatiques
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON chambres_climatiques TO anon, authenticated;
    done_list := array_append(done_list, 'table:chambres_climatiques');
  END IF;

  -- table operations_chambres
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='operations_chambres') THEN
    CREATE TABLE operations_chambres (
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
      status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at       TIMESTAMPTZ
    );
    CREATE INDEX idx_ops_chambres_chambre ON operations_chambres(chambre_id);
    CREATE INDEX idx_ops_chambres_status  ON operations_chambres(status);
    ALTER TABLE operations_chambres ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Open all operations_chambres" ON operations_chambres
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON operations_chambres TO anon, authenticated;
    done_list := array_append(done_list, 'table:operations_chambres');
  END IF;

  RETURN jsonb_build_object('done', to_jsonb(done_list));
END;
$$;

GRANT EXECUTE ON FUNCTION run_migrations() TO anon, authenticated;
