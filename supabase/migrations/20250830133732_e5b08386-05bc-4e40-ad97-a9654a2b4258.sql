-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'teacher');

-- Create enum for department names
CREATE TYPE department_name AS ENUM (
  'computer_science', 
  'electrical', 
  'mechanical', 
  'civil', 
  'electronics', 
  'information_technology',
  'biotechnology',
  'chemical'
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'teacher',
  department department_name NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_sheets table
CREATE TABLE public.purchase_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  department department_name,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create book_requests table
CREATE TABLE public.book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES public.purchase_sheets(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  author TEXT NOT NULL,
  edition TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  teacher_name TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create price_comparisons table
CREATE TABLE public.price_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_request_id UUID REFERENCES public.book_requests(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create finalized_purchases table
CREATE TABLE public.finalized_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_request_id UUID REFERENCES public.book_requests(id),
  shop_name TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  finalized_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teacher_notes table
CREATE TABLE public.teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id),
  note_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finalized_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS policies for purchase_sheets
CREATE POLICY "Admins can manage all sheets" ON public.purchase_sheets
  FOR ALL USING (public.is_admin());

CREATE POLICY "Teachers can view assigned sheets" ON public.purchase_sheets
  FOR SELECT USING (assigned_to = auth.uid());

-- RLS policies for book_requests
CREATE POLICY "Admins can manage all requests" ON public.book_requests
  FOR ALL USING (public.is_admin());

CREATE POLICY "Teachers can view own requests" ON public.book_requests
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own requests" ON public.book_requests
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own requests" ON public.book_requests
  FOR UPDATE USING (teacher_id = auth.uid());

-- RLS policies for other tables (admin only)
CREATE POLICY "Admins only" ON public.price_comparisons
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins only" ON public.finalized_purchases
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage activity logs" ON public.activity_logs
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own activity" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- RLS policies for teacher_notes
CREATE POLICY "Teachers can manage own notes" ON public.teacher_notes
  FOR ALL USING (teacher_id = auth.uid());

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_sheets_updated_at
  BEFORE UPDATE ON public.purchase_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_requests_updated_at
  BEFORE UPDATE ON public.book_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_notes_updated_at
  BEFORE UPDATE ON public.teacher_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher'),
    COALESCE((NEW.raw_user_meta_data->>'department')::department_name, 'computer_science')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();