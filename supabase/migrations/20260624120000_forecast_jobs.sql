-- Forecast jobs: submit-and-poll job store for the Python forecast service
CREATE TABLE IF NOT EXISTS public.forecast_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress NUMERIC NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can view their own forecast jobs"
ON public.forecast_jobs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can create their own forecast jobs"
ON public.forecast_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can update their own forecast jobs"
ON public.forecast_jobs FOR UPDATE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_forecast_jobs_updated_at ON public.forecast_jobs;
CREATE TRIGGER update_forecast_jobs_updated_at
  BEFORE UPDATE ON public.forecast_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_forecast_jobs_user_id ON public.forecast_jobs(user_id);
