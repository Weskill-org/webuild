
CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  redeemed boolean NOT NULL DEFAULT false,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gift cards" ON public.gift_cards
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can create gift cards" ON public.gift_cards
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can redeem gift cards" ON public.gift_cards
  FOR UPDATE TO authenticated
  USING (redeemed = false)
  WITH CHECK (redeemed_by = auth.uid());
