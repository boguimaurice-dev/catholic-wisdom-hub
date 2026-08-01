DROP POLICY "Deny client inserts on institution_codes" ON public.institution_codes;
DROP POLICY "Deny client updates on institution_codes" ON public.institution_codes;
DROP POLICY "Deny client deletes on institution_codes" ON public.institution_codes;

CREATE POLICY "Admins can create institution codes" ON public.institution_codes
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update institution codes" ON public.institution_codes
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete institution codes" ON public.institution_codes
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.institution_codes TO authenticated;