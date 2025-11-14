
-- Migration: 20251030153221
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create saved_models table
CREATE TABLE public.saved_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  date_column TEXT NOT NULL,
  segment_column TEXT NOT NULL,
  dependent_variable TEXT NOT NULL,
  prophet_params JSONB,
  autogluon_params JSONB,
  traditional_params JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_models ENABLE ROW LEVEL SECURITY;

-- Saved models policies
CREATE POLICY "Users can view their own models" 
ON public.saved_models 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own models" 
ON public.saved_models 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models" 
ON public.saved_models 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models" 
ON public.saved_models 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create model_segments table
CREATE TABLE public.model_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.saved_models(id) ON DELETE CASCADE,
  segment TEXT NOT NULL,
  segment_value TEXT NOT NULL,
  regressors JSONB,
  forecast_periods INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  total_records INTEGER NOT NULL,
  training_records INTEGER NOT NULL,
  test_records INTEGER NOT NULL,
  prophet_params JSONB,
  autogluon_params JSONB,
  traditional_params JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_segments ENABLE ROW LEVEL SECURITY;

-- Model segments policies
CREATE POLICY "Users can view segments of their own models" 
ON public.model_segments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.saved_models 
    WHERE saved_models.id = model_segments.model_id 
    AND saved_models.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create segments for their own models" 
ON public.model_segments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.saved_models 
    WHERE saved_models.id = model_segments.model_id 
    AND saved_models.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update segments of their own models" 
ON public.model_segments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.saved_models 
    WHERE saved_models.id = model_segments.model_id 
    AND saved_models.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete segments of their own models" 
ON public.model_segments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.saved_models 
    WHERE saved_models.id = model_segments.model_id 
    AND saved_models.user_id = auth.uid()
  )
);

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_models_updated_at
  BEFORE UPDATE ON public.saved_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251030162342
-- Add columns to store CSV data and forecast results
ALTER TABLE saved_models 
ADD COLUMN csv_data jsonb,
ADD COLUMN forecast_results jsonb;

-- Migration: 20251030162922
-- Create storage bucket for model pickle files
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-files', 'model-files', false);

-- Create RLS policies for model files
CREATE POLICY "Users can view their own model files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'model-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own model files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'model-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own model files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'model-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own model files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'model-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add column to store pickle file path
ALTER TABLE saved_models
ADD COLUMN model_file_path text;

-- Migration: 20251031095143
-- Create table for storing forecast reports
CREATE TABLE public.forecast_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_id UUID,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('pdf', 'html')),
  report_data JSONB NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forecast_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own reports" 
ON public.forecast_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.forecast_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.forecast_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_forecast_reports_user_id ON public.forecast_reports(user_id);
CREATE INDEX idx_forecast_reports_created_at ON public.forecast_reports(created_at DESC);
