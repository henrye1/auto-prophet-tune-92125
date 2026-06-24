# Rich Results (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a real benchmark-model comparison and per-segment AI commentary on the results page, fix the now-inaccurate chart labels, and remove the dead raw-vs-transformed UI.

**Architecture:** Mostly backend + one new edge function. The Python forecast service optionally fits a second (benchmark) model per segment and echoes `interval_width`; a new Gemini edge function generates per-segment commentary that the results page fetches progressively after results load. The results UI already renders `benchmark_*`/`ai_commentary`, so frontend changes are small wiring + cleanup.

**Tech Stack:** Python 3.11 (FastAPI, pandas, pytest), Deno edge function (Gemini), Vite + React + TypeScript + supabase-js.

## Global Constraints

- Python 3.11 env for all service tests: `/c/Users/CharlesLehong.AzureAD/miniconda3/envs/Python3.11/python.exe` (deps already installed; do NOT pip install).
- All additions are best-effort / non-blocking: a benchmark fit failure omits `benchmark_*` for that segment but the job still completes; a commentary failure hides that box only.
- Benchmark per-segment result fields the frontend consumes (exact names): `benchmark_model` (str), `benchmark_training_data`, `benchmark_test_data`, `benchmark_forecast_data` (ForecastPoint[]), `benchmark_metrics` (dict).
- Each segment result also carries `interval_width` (number, default 0.8) for accurate confidence labels.
- Transformations are OUT of scope: do not add raw/transform fields; DELETE the dead raw-vs-transformed UI.
- The Gemini edge function uses `GEMINI_API_KEY` (already a Supabase secret) and the `generativelanguage.googleapis.com` `gemini-2.5-flash` endpoint, matching `supabase/functions/analyze-transformations/index.ts`.
- Frontend has no JS test runner: verify with `npx tsc --noEmit -p tsconfig.app.json` and manual `/run`.
- Supabase CLI is logged in + linked (project `lhwvbvremwspkzcpxqve`); edge deploy via `npx supabase functions deploy <name>`.

---

### Task 1: Backend — interval_width + optional benchmark model

**Files:**
- Modify: `forecast-service/app/schemas.py`
- Modify: `forecast-service/app/jobs.py`
- Modify: `forecast-service/tests/test_jobs.py`

**Interfaces:**
- Consumes: `app.models.get_model`, `app.utils.split_segment`, `app.db.update_job`, `app.schemas.{ForecastRequest, SegmentSpec, SegmentOutput, ForecastPoint}`.
- Produces: per-segment result dicts that may include `interval_width` and the `benchmark_*` fields listed in Global Constraints.

- [ ] **Step 1: Add `benchmark_model` to the request schema**

In `forecast-service/app/schemas.py`, change the `ForecastRequest` class to add the optional field:

```python
class ForecastRequest(BaseModel):
    model: str  # "prophet" | "autogluon"
    date_column: str
    segment_column: str
    dependent_variable: str
    segments: list[SegmentSpec]
    data: list[dict[str, Any]]
    metrics: list[str]
    benchmark_model: Optional[str] = None
```

- [ ] **Step 2: Write the failing tests in `forecast-service/tests/test_jobs.py`**

Append these tests (keep the existing `test_process_job_per_segment_failure_does_not_abort`). Add imports at the top if missing: `from app.schemas import ForecastRequest, SegmentSpec, SegmentOutput, ForecastPoint`.

```python
def _stub_out():
    p = ForecastPoint(date="2020-01-01", predicted=1.0, lower_bound=0.5, upper_bound=1.5)
    return SegmentOutput(training_data=[p], test_data=[p], forecast_data=[p], metrics={"mae": 0.1})


def _bm_request():
    rows = [{"date": f"2020-{m:02d}-01", "segment": "A", "y": float(m)} for m in range(1, 5)]
    return ForecastRequest(
        model="prophet", date_column="date", segment_column="segment",
        dependent_variable="y",
        segments=[SegmentSpec(segmentValue="A", segment="seg", forecast_periods=1,
                              frequency="MS", training_records=3, test_records=1,
                              prophet_params={"interval_width": 0.8})],
        data=rows, metrics=["mae"], benchmark_model="autogluon",
    )


def test_interval_width_in_result(monkeypatch):
    monkeypatch.setattr(jobs, "get_model", lambda name: (lambda **kw: _stub_out()))
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    req = _bm_request()
    req.benchmark_model = None
    jobs.process_job("job-iw", req)
    seg = captured[-1]["results"]["segments"][0]
    assert seg["interval_width"] == 0.8


def test_benchmark_attached(monkeypatch):
    monkeypatch.setattr(jobs, "get_model", lambda name: (lambda **kw: _stub_out()))
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    jobs.process_job("job-bm", _bm_request())
    seg = captured[-1]["results"]["segments"][0]
    assert seg["benchmark_model"] == "autogluon"
    assert seg["benchmark_test_data"] and seg["benchmark_forecast_data"]
    assert seg["benchmark_metrics"] == {"mae": 0.1}


def test_benchmark_failure_keeps_primary(monkeypatch):
    def fake_get(name):
        if name == "autogluon":
            def boom(**kw):
                raise RuntimeError("benchmark failed")
            return boom
        return lambda **kw: _stub_out()
    monkeypatch.setattr(jobs, "get_model", fake_get)
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    jobs.process_job("job-bmfail", _bm_request())
    final = captured[-1]
    seg = final["results"]["segments"][0]
    assert "benchmark_model" not in seg          # benchmark omitted
    assert seg["test_data"]                        # primary intact
    assert final["status"] == "completed"
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125\forecast-service" && "/c/Users/CharlesLehong.AzureAD/miniconda3/envs/Python3.11/python.exe" -m pytest tests/test_jobs.py -v`
Expected: the 3 new tests FAIL (no `interval_width` / no `benchmark_*` keys); the existing test still passes.

- [ ] **Step 4: Implement in `forecast-service/app/jobs.py`**

Replace the entire `process_job` function with this version (adds `interval_width`, resolves an optional benchmark fitter once, and attaches `benchmark_*` per segment in its own try/except):

```python
def process_job(job_id: str, req: ForecastRequest) -> None:
    try:
        db.update_job(job_id, {"status": "running", "progress": 0})
        started_at = datetime.now(timezone.utc).isoformat()
        full = pd.DataFrame(req.data)
        fit_forecast = get_model(req.model)

        # Resolve the optional benchmark fitter once (best-effort).
        bm_name = req.benchmark_model
        bm_fit = None
        if bm_name and bm_name != req.model:
            try:
                bm_fit = get_model(bm_name)
            except Exception:  # noqa: BLE001
                bm_fit = None

        total = len(req.segments)
        segments_out = []

        for i, spec in enumerate(req.segments):
            seg_df = full[full[req.segment_column] == spec.segmentValue]
            try:
                if len(seg_df) < spec.training_records + 1 or spec.training_records < MIN_TRAIN_RECORDS:
                    raise ValueError("Not enough data to train this segment")
                train, test = split_segment(
                    seg_df, req.date_column, spec.training_records, spec.test_records
                )
                params = spec.prophet_params or {}
                out = fit_forecast(
                    train_df=train, test_df=test,
                    date_column=req.date_column, value_column=req.dependent_variable,
                    future_periods=spec.forecast_periods, freq=spec.frequency,
                    params=params, selected_metrics=req.metrics,
                )
                seg_result = {
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model,
                    "interval_width": params.get("interval_width", 0.8),
                    **out.model_dump(exclude_none=True),
                }

                if bm_fit is not None:
                    try:
                        bm_out = bm_fit(
                            train_df=train, test_df=test,
                            date_column=req.date_column, value_column=req.dependent_variable,
                            future_periods=spec.forecast_periods, freq=spec.frequency,
                            params=params, selected_metrics=req.metrics,
                        )
                        bm = bm_out.model_dump(exclude_none=True)
                        seg_result["benchmark_model"] = bm_name
                        seg_result["benchmark_training_data"] = bm["training_data"]
                        seg_result["benchmark_test_data"] = bm["test_data"]
                        seg_result["benchmark_forecast_data"] = bm["forecast_data"]
                        seg_result["benchmark_metrics"] = bm["metrics"]
                    except Exception:  # noqa: BLE001
                        pass  # benchmark is best-effort; omit on failure

                segments_out.append(seg_result)
            except Exception as seg_err:  # noqa: BLE001
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model, "error": str(seg_err),
                    "training_data": [], "test_data": [], "forecast_data": [], "metrics": {},
                })

            progress = round((i + 1) / total * 100)
            db.update_job(job_id, {
                "status": "running", "progress": progress,
                "results": {"segments": segments_out, "model": req.model, "timestamp": started_at},
            })

        db.update_job(job_id, {
            "status": "completed", "progress": 100,
            "results": {"segments": segments_out, "model": req.model, "timestamp": started_at},
        })
    except Exception as err:  # noqa: BLE001
        db.update_job(job_id, {"status": "failed", "error": str(err)})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125\forecast-service" && "/c/Users/CharlesLehong.AzureAD/miniconda3/envs/Python3.11/python.exe" -m pytest tests/test_jobs.py tests/test_endpoint.py -v`
Expected: all pass (4 in test_jobs + 2 in test_endpoint), no warnings.

- [ ] **Step 6: Commit**

```bash
git add forecast-service/app/schemas.py forecast-service/app/jobs.py forecast-service/tests/test_jobs.py
git commit -m "feat(forecast-service): optional benchmark model fit + interval_width in results"
```

---

### Task 2: New `forecast-commentary` edge function

**Files:**
- Create: `supabase/functions/forecast-commentary/index.ts`

**Interfaces:**
- Produces: `POST forecast-commentary` accepting `{ segmentValue, model, metrics, forecastSummary }`, returning `{ commentary: string }`.

- [ ] **Step 1: Create `supabase/functions/forecast-commentary/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segmentValue, model, metrics, forecastSummary } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt =
      'You are a forecasting analyst. In 2-3 short, plain-language sentences, ' +
      'comment on how well the model fit this segment and what its forecast implies. ' +
      'Be concrete about the metrics. Do not use markdown or headers. Plain text only.';

    const userPrompt = `Segment: ${segmentValue}
Model: ${model}
Test-set metrics: ${JSON.stringify(metrics)}
Forecast summary: ${JSON.stringify(forecastSummary)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const commentary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!commentary) {
      console.error('Unexpected Gemini response:', JSON.stringify(data));
      throw new Error('No content in Gemini response');
    }

    return new Response(JSON.stringify({ commentary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in forecast-commentary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Deploy the function**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx supabase functions deploy forecast-commentary --project-ref lhwvbvremwspkzcpxqve 2>&1 | tail -10`
Expected: `Deployed Functions on project lhwvbvremwspkzcpxqve: forecast-commentary`.

- [ ] **Step 3: Smoke-test the deployed function**

Run (uses the publishable key as apikey; expect a JSON `{"commentary": "..."}`):
```bash
curl -s -m 30 -X POST "https://lhwvbvremwspkzcpxqve.supabase.co/functions/v1/forecast-commentary" \
  -H "apikey: sb_publishable_KVaiGuzmk_yUYgpY8YYuew_9_MlzWc2" \
  -H "Content-Type: application/json" \
  -d '{"segmentValue":"North","model":"prophet","metrics":{"mae":120.5,"rmse":150.2},"forecastSummary":{"first":1300,"last":1500,"direction":"up"}}'
```
Expected: a JSON body with a non-empty `commentary` string. If it returns an auth error, add `-H "Authorization: Bearer sb_publishable_KVaiGuzmk_yUYgpY8YYuew_9_MlzWc2"` and retry.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/forecast-commentary/index.ts
git commit -m "feat(edge): add forecast-commentary Gemini function"
```

---

### Task 3: Frontend — benchmark toggle + payload wiring

**Files:**
- Modify: `src/lib/forecastClient.ts`
- Modify: `src/pages/Index.tsx`

**Interfaces:**
- Consumes: `ForecastModel` type, `ModelSelector`.
- Produces: payload carrying optional `benchmark_model` when the benchmark toggle is on.

- [ ] **Step 1: Add `benchmark_model` to the payload type**

In `src/lib/forecastClient.ts`, add the optional field to `ForecastJobPayload`:

```typescript
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
```

- [ ] **Step 2: Add benchmark UI state in `src/pages/Index.tsx`**

Near the other `useState` calls (after `const [selectedModel, setSelectedModel] = useState<ForecastModel>("prophet");` at line 34), add:

```typescript
  const [benchmarkEnabled, setBenchmarkEnabled] = useState(false);
  const [benchmarkModel, setBenchmarkModel] = useState<ForecastModel>("autogluon");
```

- [ ] **Step 3: Render the benchmark control in the Model tab**

In the `<TabsContent value="model" ...>` block (around line 435), immediately AFTER `<ModelSelector .../>` (line 436), add this card. Ensure `Switch`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Card`/`CardContent`/`CardHeader`/`CardTitle`/`CardDescription`, and `Label` are imported in the file (add any missing imports from `@/components/ui/*`):

```tsx
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benchmark Comparison</CardTitle>
                <CardDescription>
                  Optionally fit a second model to compare side by side. Note: an AutoGluon
                  benchmark roughly doubles run time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="benchmark-toggle"
                    checked={benchmarkEnabled}
                    onCheckedChange={setBenchmarkEnabled}
                  />
                  <Label htmlFor="benchmark-toggle">Compare against a benchmark model</Label>
                </div>
                {benchmarkEnabled && (
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="benchmark-model">Benchmark model</Label>
                    <Select value={benchmarkModel} onValueChange={(v) => setBenchmarkModel(v as ForecastModel)}>
                      <SelectTrigger id="benchmark-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="prophet">Facebook Prophet</SelectItem>
                        <SelectItem value="autogluon">AWS AutoGluon</SelectItem>
                      </SelectContent>
                    </Select>
                    {benchmarkModel === selectedModel && (
                      <p className="text-xs text-destructive">
                        Pick a model different from the primary ({selectedModel}).
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
```

- [ ] **Step 4: Include `benchmark_model` in the run payload**

In `handleRunForecast` (the `payload` object built around line 334), add the `benchmark_model` field right after `metrics: selectedMetrics,`:

```typescript
        benchmark_model:
          benchmarkEnabled && benchmarkModel !== selectedModel ? benchmarkModel : undefined,
```

- [ ] **Step 5: Typecheck**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors. (Resolve any missing-import errors by adding the named imports from `@/components/ui/*`.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/forecastClient.ts src/pages/Index.tsx
git commit -m "feat(web): opt-in benchmark model toggle wired into the run payload"
```

---

### Task 4: Frontend — fix labels + remove dead raw/transform UI

**Files:**
- Modify: `src/components/forecast/ForecastResults.tsx`
- Modify: `src/components/forecast/ResultsTable.tsx`

**Interfaces:**
- Consumes: segment results with `interval_width`, `benchmark_*`.

- [ ] **Step 1: Fix the main chart title**

In `src/components/forecast/ForecastResults.tsx`, find the card title `Complete Time Series: With Transformations` (around line 523) and change it to `Complete Time Series`. Remove the adjacent `{segment.transformations_applied && ( ...Badge... )}` block inside that `<CardTitle>` (it can never render now).

- [ ] **Step 2: Fix the confidence legend badge**

In the same card's legend badges (around line 549-551), replace the hardcoded `95% Confidence` badge text with a dynamic value:

```tsx
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30">
                    <div className="w-3 h-3 bg-emerald-600/40 mr-2" />
                    {((segment.interval_width ?? 0.8) * 100).toFixed(0)}% Confidence
                  </Badge>
```

- [ ] **Step 3: Remove the dead raw-vs-transformed sections**

Delete these three blocks entirely from `ForecastResults.tsx` (they are gated on `segment.raw_*` which the backend never produces):
1. The `{/* Transformation Impact Comparison - Separate Charts */}` block — the `{segment.raw_test_data && segment.raw_metrics && segment.test_data.length > 0 && ( ... )}` containing the two side-by-side cards.
2. The `{/* Alert when no test data available */}` block — `{segment.raw_test_data && segment.raw_metrics && segment.test_data.length === 0 && ( ...Alert... )}`.
3. The `{/* Complete Time Series - Raw Data */}` block — `{segment.raw_training_data && segment.raw_test_data && segment.raw_forecast_data && ( ...Card... )}`.

Also remove the now-unused `vs raw` rendering inside the metrics card: delete the `const rawValue = segment.raw_metrics?.[metric];` line and the `{rawValue !== undefined && ( ... )}` block and `isBetterThanRaw` usage (keep `isBetterThanBenchmark`). Keep all benchmark rendering.

- [ ] **Step 4: Remove raw props from ResultsTable usage**

In `ForecastResults.tsx`, in the `<ResultsTable ... />` call (around line 807-820), delete the `rawTrainingData`, `rawTestData`, `rawForecastData` props. Keep the benchmark props.

- [ ] **Step 5: Remove raw support from `ResultsTable.tsx`**

In `src/components/forecast/ResultsTable.tsx`: remove the `rawTrainingData`, `rawTestData`, `rawForecastData` props from the interface and destructuring; delete `const hasRawData = ...` and `allRawData`; remove the `activeView` state and the transformed/raw `<Tabs>` toggle so the table always shows the primary (and benchmark) view. Keep `benchmark*` props and behaviour. Verify no remaining references to the removed names.

- [ ] **Step 6: Typecheck**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors. Fix any unused-symbol errors by removing the dead code they point at.

- [ ] **Step 7: Commit**

```bash
git add src/components/forecast/ForecastResults.tsx src/components/forecast/ResultsTable.tsx
git commit -m "fix(web): correct results labels and remove dead raw-vs-transformed UI"
```

---

### Task 5: Frontend — progressive per-segment AI commentary

**Files:**
- Modify: `src/components/forecast/ForecastResults.tsx`

**Interfaces:**
- Consumes: `supabase` client (`@/integrations/supabase/client`), the deployed `forecast-commentary` function.

- [ ] **Step 1: Add commentary state + fetch effect**

In `ForecastResults.tsx`, add the `supabase` import (`import { supabase } from "@/integrations/supabase/client";`) and `useEffect` to the React import. Inside the component (near the other `useState` calls), add state and an effect that fetches commentary once per segment after results load:

```tsx
  const [commentary, setCommentary] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setCommentary({});
    (results.segments || []).forEach(async (seg) => {
      if (seg.error) return;
      const fc = seg.forecast_data || [];
      const forecastSummary = fc.length > 0
        ? { first: fc[0].predicted, last: fc[fc.length - 1].predicted, periods: fc.length }
        : { periods: 0 };
      try {
        const { data, error } = await supabase.functions.invoke("forecast-commentary", {
          body: { segmentValue: seg.segmentValue, model: seg.model || results.model,
                  metrics: seg.metrics || {}, forecastSummary },
        });
        if (!cancelled && !error && data?.commentary) {
          setCommentary((prev) => ({ ...prev, [seg.segmentValue]: data.commentary }));
        }
      } catch {
        // best-effort; leave commentary box hidden on failure
      }
    });
    return () => { cancelled = true; };
  }, [results]);
```

- [ ] **Step 2: Render the fetched commentary**

In the metrics card, replace the existing `{segment.ai_commentary && ( ...AI Analysis Alert... )}` block so it reads from the fetched `commentary` map instead of the (never-populated) `segment.ai_commentary`:

```tsx
                  {commentary[segment.segmentValue] && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <Wand2 className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold text-sm mb-2">AI Analysis</p>
                        <p className="text-sm whitespace-pre-line">{commentary[segment.segmentValue]}</p>
                      </AlertDescription>
                    </Alert>
                  )}
```

- [ ] **Step 3: Typecheck**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/forecast/ForecastResults.tsx
git commit -m "feat(web): progressive per-segment AI commentary on results"
```

---

### Task 6: End-to-end manual verification (local)

**Files:** none (verification only).

- [ ] **Step 1: Ensure both servers are running**

Vite on http://localhost:8080 and the forecast-service on http://localhost:8000 (relaunch the service via the scratchpad launcher if needed). Restart Vite if `.env`/code changed.

- [ ] **Step 2: Benchmark run.** In the browser: sign in, upload `sample_timeseries.csv`, set columns (date/segment/sales), model = Prophet, open the Model tab, enable **Compare against a benchmark model** with AutoGluon, run. Confirm: results show primary Prophet metrics/lines AND a benchmark (AutoGluon) comparison; allow a few minutes for AutoGluon.

- [ ] **Step 3: Commentary.** On the results page, confirm each segment's **AI Analysis** box populates a sentence or two a moment after results render.

- [ ] **Step 4: Labels.** Confirm the time-series card title reads "Complete Time Series" (no "With Transformations") and the confidence badge reads the real interval (e.g. "80% Confidence"); confirm no empty raw-vs-transformed cards appear.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: phase 2 verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** benchmark → Task 1 (backend) + Task 3 (UI/payload) + render (already in ForecastResults/ResultsTable); AI commentary → Task 2 (edge fn) + Task 5 (progressive fetch/render); label fix + cleanup → Task 4; interval_width → Task 1; testing → Task 1 (pytest), Tasks 3-5 (tsc), Task 6 (manual). Transformations explicitly removed (Task 4).
- **Best-effort/non-blocking:** benchmark wrapped in per-segment try/except (Task 1); commentary swallowed on error (Task 5).
- **Type consistency:** `benchmark_model`/`benchmark_training_data`/`benchmark_test_data`/`benchmark_forecast_data`/`benchmark_metrics` and `interval_width` are produced in Task 1 and consumed verbatim by the existing `ForecastResults.tsx`/`ResultsTable.tsx` props. `ForecastJobPayload.benchmark_model` (Task 3) matches `ForecastRequest.benchmark_model` (Task 1). The commentary function I/O (`{segmentValue, model, metrics, forecastSummary}` → `{commentary}`) matches between Task 2 and Task 5.
- **Known follow-up:** the `forecast-commentary` function must also be set up on any non-local deploy; it relies on `GEMINI_API_KEY` already present in Supabase.
