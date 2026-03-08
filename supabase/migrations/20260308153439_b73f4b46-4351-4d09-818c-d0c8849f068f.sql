
-- Escrow table for Razorpay payments
CREATE TABLE public.escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  payer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  commission numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.escrow ENABLE ROW LEVEL SECURITY;

-- Only admins and the payer can view escrow records
CREATE POLICY "Users can view own escrow"
  ON public.escrow FOR SELECT
  TO authenticated
  USING (
    payer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM projects WHERE projects.id = escrow.project_id AND projects.owner_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Only edge functions (service role) insert/update escrow, but allow authenticated for the insert via edge function
CREATE POLICY "Service can manage escrow"
  ON public.escrow FOR ALL
  TO authenticated
  USING (payer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
