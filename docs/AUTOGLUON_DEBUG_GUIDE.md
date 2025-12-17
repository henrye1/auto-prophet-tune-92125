# AutoGluon Debug Guide

## Issue Fixed

The React app was calling the old `TEST_FUNC` endpoint which only runs Prophet. Now it's using the new `/api/forecast` endpoint which supports both Prophet and AutoGluon.

## Changes Made

### 1. Fixed React App ([src/pages/Index.tsx](../src/pages/Index.tsx))

**Before:**
```typescript
const AZURE_FUNCTION_URL = "http://localhost:7071/api/TEST_FUNC";
// Direct fetch call to old endpoint
```

**After:**
```typescript
import { azureFunctionService } from "@/services/azureFunctionService";
// Uses new service that calls /api/forecast
```

### 2. Updated Forecast Function

The `runForecast()` function now:
- Uses `azureFunctionService.runForecast()` instead of direct fetch
- Passes proper config format expected by new endpoint
- Supports both Prophet and AutoGluon models

## How to Test

### 1. Restart Azure Function
```bash
cd "C:\Users\APR\OneDrive - Anchor Point Risk (Pty) Ltd\Documents\GitHub\az-func-template-py"
func start
```

You should see:
```
Functions:
    forecast: [POST] http://localhost:7071/api/forecast
    health: [GET] http://localhost:7071/api/health
    TEST_FUNC: [GET,POST] http://localhost:7071/api/TEST_FUNC
```

### 2. Restart React App
```bash
cd "C:\Users\APR\OneDrive - Anchor Point Risk (Pty) Ltd\Documents\GitHub\auto-prophet-tune-92125"
npm run dev
```

### 3. Run AutoGluon Forecast

1. Upload your CSV data
2. Select **AutoGluon** as the model
3. Configure segments and metrics
4. Click "Run Forecast"
5. **Watch the Azure Function terminal**

You should now see:
```
================================================================================
AUTOGLUON FORECAST DEBUG TRACE START
================================================================================
✓ AutoGluon is available

Configuration:
  - Date column: date
  - Dependent variable: value
  - Segment: YourSegment
  - Train records: 100
  - Test records: 20
  - Forecast periods: 10

Step 1: Preparing data...
  - Total rows in input data: 120
  - Columns: ['date', 'value']
  ...

Step 5: Fitting AutoGluon models...
  - This will train multiple models and may take several minutes...
  [AutoGluon training output]
  ✓ Model fitting completed in 45.23 seconds

Step 6: Generating leaderboard...
================================================================================
AUTOGLUON LEADERBOARD:
================================================================================

                    model  score_val  pred_time_val  ...
0         WeightedEnsemble     12.345         0.123  ...
1                    ARIMA     13.456         0.234  ...
2                      ETS     14.567         0.345  ...

================================================================================

  ✓ Best model: WeightedEnsemble
  ✓ Best validation score (MAE): 12.3450

...

================================================================================
AUTOGLUON FORECAST COMPLETED
Total execution time: 52.34 seconds
Models trained: 8
Best model: WeightedEnsemble
================================================================================
```

## What to Expect

### Prophet Forecast
- **Speed:** Fast (2-5 seconds)
- **Logs:** Simple Prophet model fitting logs
- **No leaderboard** (single model)

### AutoGluon Forecast
- **Speed:** Slow (30-120 seconds depending on data size)
- **Logs:** Detailed debug trace with 11 steps
- **Leaderboard shown** in terminal and returned in JSON

## Viewing the Leaderboard

### In Terminal Logs
The complete leaderboard is printed to the Azure Function terminal.

### In JSON Response
The leaderboard is also included in the response:

```json
{
  "success": true,
  "results": {
    "modelType": "autogluon",
    "segmentResults": [{
      "modelConfig": {
        "model": "autogluon",
        "best_model": "WeightedEnsemble",
        "best_score_val": 12.345,
        "num_models_trained": 8,
        "leaderboard": [
          {
            "model": "WeightedEnsemble",
            "score_val": 12.345,
            "pred_time_val": 0.123
          },
          ...
        ]
      }
    }]
  }
}
```

## Troubleshooting

### Still seeing Prophet logs only?
1. Clear your browser cache
2. Hard refresh the React app (Ctrl+Shift+R)
3. Check browser console - ensure no errors
4. Verify you selected "AutoGluon" in the model selector

### Not seeing debug logs?
1. Ensure Azure Function was restarted after code changes
2. Check that `forecast/__init__.py` has the updated code
3. Verify the React app is calling `http://localhost:7071/api/forecast`

### AutoGluon not available?
Run in Azure Function directory:
```bash
pip install autogluon.timeseries[all]
func start
```

Check health endpoint:
```bash
curl http://localhost:7071/api/health
```

Should return:
```json
{
  "status": "healthy",
  "models": {
    "prophet": true,
    "autogluon": true
  }
}
```

## Browser Network Tab

To verify the correct endpoint is being called:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Run a forecast
4. Look for a POST request to `http://localhost:7071/api/forecast`
5. Click on it to see the request/response

**Request should look like:**
```json
{
  "config": {
    "model": "autogluon",
    "dateColumn": "date",
    "dependentVariable": "value",
    ...
  },
  "data": [...]
}
```

If you see a request to `/api/TEST_FUNC`, the React app hasn't reloaded properly.
