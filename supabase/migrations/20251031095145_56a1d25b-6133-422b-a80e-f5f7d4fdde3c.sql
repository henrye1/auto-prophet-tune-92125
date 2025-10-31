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