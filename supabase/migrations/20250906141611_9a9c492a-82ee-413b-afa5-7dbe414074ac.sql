-- Create history tables for archiving completed purchase cycles
CREATE TABLE public.purchase_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_sheet_id uuid,
  sheet_name text NOT NULL,
  department department_name,
  created_by uuid,
  assigned_to uuid,
  status text NOT NULL,
  cycle_closed_at timestamp with time zone NOT NULL DEFAULT now(),
  cycle_closed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.book_requests_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL,
  original_request_id uuid,
  book_name text NOT NULL,
  author text NOT NULL,
  edition text NOT NULL,
  quantity integer NOT NULL,
  teacher_name text NOT NULL,
  teacher_id uuid,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.finalized_purchases_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL,
  original_purchase_id uuid,
  original_book_request_id uuid,
  shop_name text NOT NULL,
  price_per_unit numeric NOT NULL,
  total_amount numeric NOT NULL,
  finalized_by uuid,
  book_name text NOT NULL,
  author text NOT NULL,
  edition text NOT NULL,
  quantity integer NOT NULL,
  teacher_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finalized_purchases_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Admin only access to history
CREATE POLICY "Admins only access purchase history" 
ON public.purchase_history 
FOR ALL 
USING (is_admin());

CREATE POLICY "Admins only access book requests history" 
ON public.book_requests_history 
FOR ALL 
USING (is_admin());

CREATE POLICY "Admins only access finalized purchases history" 
ON public.finalized_purchases_history 
FOR ALL 
USING (is_admin());