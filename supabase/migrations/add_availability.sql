ALTER TABLE public.home_restaurants
ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS closed_message text DEFAULT null;
