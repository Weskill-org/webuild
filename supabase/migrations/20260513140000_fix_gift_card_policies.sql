
-- Drop existing broken policies
DROP POLICY IF EXISTS "Admins can create gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can manage gift cards" ON public.gift_cards;

-- Re-create the policy using the reliable profiles.role check
CREATE POLICY "Admins can manage gift cards" ON public.gift_cards
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);
