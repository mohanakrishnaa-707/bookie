-- Ensure system_settings table has a default record
INSERT INTO public.system_settings (teacher_registration_enabled, admin_registration_enabled, request_deadline)
VALUES (true, true, null)
ON CONFLICT (id) DO NOTHING;

-- If no records exist, insert a default one
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_settings) THEN
    INSERT INTO public.system_settings (teacher_registration_enabled, admin_registration_enabled, request_deadline)
    VALUES (true, true, null);
  END IF;
END $$;