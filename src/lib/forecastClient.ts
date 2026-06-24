import { supabase } from "@/integrations/supabase/client";
import type { ForecastResults } from "@/types/forecastResults";

export interface ForecastSegmentSpec {
  segmentValue: string;
  segment: string;
  forecast_periods: number;
  frequency: string;
  training_records: number;
  test_records: number;
  prophet_params?: Record<string, unknown> | null;
}

export interface ForecastJobPayload {
  model: string;
  date_column: string;
  segment_column: string;
  dependent_variable: string;
  segments: ForecastSegmentSpec[];
  data: any[];
  metrics: string[];
  benchmark_model?: string;
}

const SERVICE_URL = import.meta.env.VITE_FORECAST_SERVICE_URL as string;

export async function submitForecast(
  payload: ForecastJobPayload,
  accessToken: string,
): Promise<string> {
  if (!SERVICE_URL) {
    throw new Error("VITE_FORECAST_SERVICE_URL is not configured");
  }

  const doPost = () =>
    fetch(`${SERVICE_URL}/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

  let resp: Response;
  try {
    resp = await doPost();
  } catch {
    // one retry for Render cold start
    await new Promise((r) => setTimeout(r, 3000));
    resp = await doPost();
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Forecast submit failed (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  return json.job_id as string;
}

export function pollForecastJob(
  jobId: string,
  onProgress: (progress: number) => void,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<ForecastResults> {
  const intervalMs = opts.intervalMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Forecast timed out; the job may still be running."));
        return;
      }
      const { data, error } = await supabase
        .from("forecast_jobs")
        .select("status, progress, results, error")
        .eq("id", jobId)
        .single();

      if (error) {
        reject(new Error(error.message));
        return;
      }
      onProgress(Number(data.progress) || 0);

      if (data.status === "completed") {
        resolve(data.results as unknown as ForecastResults);
        return;
      }
      if (data.status === "failed") {
        reject(new Error(data.error || "Forecast failed"));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
