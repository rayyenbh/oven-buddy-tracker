GRANT DELETE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Profiles delete admin" ON public.profiles;
CREATE POLICY "Profiles delete admin"
  ON public.profiles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
