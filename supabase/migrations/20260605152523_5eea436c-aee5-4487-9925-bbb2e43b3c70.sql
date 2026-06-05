CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_count INT;
  requested TEXT;
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
  requested := NEW.raw_user_meta_data->>'requested_role';

  IF admin_count = 0 THEN
    assigned_role := 'admin'::public.app_role;
  ELSIF requested = 'admin' THEN
    assigned_role := 'admin'::public.app_role;
  ELSIF requested = 'technicien' THEN
    assigned_role := 'technicien'::public.app_role;
  ELSE
    assigned_role := 'technicien'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();