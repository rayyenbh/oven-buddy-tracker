
-- === 1. Move has_role() out of the exposed public schema ===
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- === 2. Rewrite policies: replace public.has_role -> private.has_role, and
--        replace "USING (true)" with explicit role scoping ===

-- operations
DROP POLICY IF EXISTS "Ops delete auth" ON public.operations;
DROP POLICY IF EXISTS "Ops insert auth" ON public.operations;
DROP POLICY IF EXISTS "Ops read auth"   ON public.operations;
DROP POLICY IF EXISTS "Ops update auth" ON public.operations;
CREATE POLICY "Ops read auth"   ON public.operations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Ops insert auth" ON public.operations FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Ops update auth" ON public.operations FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Ops delete auth" ON public.operations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));

-- operation_cables
DROP POLICY IF EXISTS "Cables delete auth" ON public.operation_cables;
DROP POLICY IF EXISTS "Cables insert auth" ON public.operation_cables;
DROP POLICY IF EXISTS "Cables read auth"   ON public.operation_cables;
DROP POLICY IF EXISTS "Cables update auth" ON public.operation_cables;
CREATE POLICY "Cables read auth"   ON public.operation_cables FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Cables insert auth" ON public.operation_cables FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Cables update auth" ON public.operation_cables FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Cables delete auth" ON public.operation_cables FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));

-- reservations
DROP POLICY IF EXISTS "Resv delete auth" ON public.reservations;
DROP POLICY IF EXISTS "Resv insert auth" ON public.reservations;
DROP POLICY IF EXISTS "Resv read auth"   ON public.reservations;
DROP POLICY IF EXISTS "Resv update auth" ON public.reservations;
CREATE POLICY "Resv read auth"   ON public.reservations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Resv insert auth" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Resv update auth" ON public.reservations FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));
CREATE POLICY "Resv delete auth" ON public.reservations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'technicien'::app_role));

-- user_roles (repoint to private.has_role)
DROP POLICY IF EXISTS "Admins manage roles delete" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles update" ON public.user_roles;
DROP POLICY IF EXISTS "Roles readable by self or admin" ON public.user_roles;
CREATE POLICY "Admins manage roles delete" ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage roles insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage roles update" ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Roles readable by self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

-- ovens (repoint to private.has_role)
DROP POLICY IF EXISTS "Ovens delete admin" ON public.ovens;
DROP POLICY IF EXISTS "Ovens insert admin" ON public.ovens;
DROP POLICY IF EXISTS "Ovens update admin" ON public.ovens;
CREATE POLICY "Ovens delete admin" ON public.ovens FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Ovens insert admin" ON public.ovens FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Ovens update admin" ON public.ovens FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- === 3. Remove the public.has_role function now that nothing references it ===
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- === 4. Restrict handle_new_user (trigger only, no direct callers) ===
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- === 5. Realtime channel authorization ===
-- The app only uses postgres_changes (governed by source-table RLS).
-- Enable RLS on realtime.messages with no permissive policies so no client can
-- subscribe to Broadcast/Presence topics.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
