
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'technicien');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Roles readable by self or admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGER : nouvel utilisateur ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  assigned_role := CASE WHEN admin_count = 0 THEN 'admin'::public.app_role ELSE 'technicien'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ OPERATIONS : nouveaux champs ============
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS temperature NUMERIC,
  ADD COLUMN IF NOT EXISTS duree_heures NUMERIC;

-- ============ OPERATION_CABLES ============
CREATE TABLE public.operation_cables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 1,
  type TEXT,
  section TEXT,
  couleur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_cables TO authenticated;
GRANT ALL ON public.operation_cables TO service_role;
ALTER TABLE public.operation_cables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cables read auth" ON public.operation_cables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cables insert auth" ON public.operation_cables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Cables update auth" ON public.operation_cables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Cables delete auth" ON public.operation_cables FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_operation_cables_op ON public.operation_cables(operation_id);

-- ============ OVENS : RLS resserrée (admin uniquement pour écriture) ============
DROP POLICY IF EXISTS "Open read ovens" ON public.ovens;
DROP POLICY IF EXISTS "Open insert ovens" ON public.ovens;
DROP POLICY IF EXISTS "Open update ovens" ON public.ovens;
DROP POLICY IF EXISTS "Open delete ovens" ON public.ovens;

REVOKE ALL ON public.ovens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ovens TO authenticated;

CREATE POLICY "Ovens read auth" ON public.ovens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ovens insert admin" ON public.ovens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Ovens update admin" ON public.ovens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Ovens delete admin" ON public.ovens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ OPERATIONS : RLS resserrée (auth uniquement) ============
DROP POLICY IF EXISTS "Open read operations" ON public.operations;
DROP POLICY IF EXISTS "Open insert operations" ON public.operations;
DROP POLICY IF EXISTS "Open update operations" ON public.operations;
DROP POLICY IF EXISTS "Open delete operations" ON public.operations;

REVOKE ALL ON public.operations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;

CREATE POLICY "Ops read auth" ON public.operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops insert auth" ON public.operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Ops update auth" ON public.operations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Ops delete auth" ON public.operations FOR DELETE TO authenticated USING (true);

-- ============ RESERVATIONS : RLS resserrée (si table existe) ============
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reservations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Open read reservations" ON public.reservations';
    EXECUTE 'DROP POLICY IF EXISTS "Open insert reservations" ON public.reservations';
    EXECUTE 'DROP POLICY IF EXISTS "Open update reservations" ON public.reservations';
    EXECUTE 'DROP POLICY IF EXISTS "Open delete reservations" ON public.reservations';
    EXECUTE 'REVOKE ALL ON public.reservations FROM anon';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated';
    EXECUTE 'CREATE POLICY "Resv read auth" ON public.reservations FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Resv insert auth" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Resv update auth" ON public.reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Resv delete auth" ON public.reservations FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;
