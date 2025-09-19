-- Fix recursive RLS on profiles and allow admin updates
-- 1) Drop the recursive SELECT policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can view all profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view all profiles" ON public.profiles';
  END IF;
END $$;

-- 2) Recreate a safe SELECT policy using the SECURITY DEFINER function
CREATE POLICY "Admins can view all profiles (via fn)"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- 3) Allow admins to update any profile (needed for Admin Users page)
-- Requires both USING and WITH CHECK for UPDATE
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());