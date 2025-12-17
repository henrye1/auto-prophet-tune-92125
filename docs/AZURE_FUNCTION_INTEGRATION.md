# Azure Function Integration Guide

This guide explains how to integrate your Python Azure Function (Prophet/AutoGluon forecasting) with the React frontend.

## Overview

The frontend communicates with a Python Azure Function backend that handles:
- Prophet time series forecasting
- AutoGluon time series forecasting
- Data processing and transformations
- Performance metrics calculation

## Architecture

```
React Frontend (TypeScript)
    ↓
azureFunctionService.ts (API Client)
    ↓
HTTP POST Request
    ↓
Azure Function (Python)
    ↓
Prophet/AutoGluon Libraries
    ↓
Forecast Results (JSON)
```

## Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# For local development
VITE_AZURE_FUNCTION_URL=http://localhost:7071/api

# For production (after deployment)
# VITE_AZURE_FUNCTION_URL=https://your-app.azurewebsites.net/api
```

### 2. Run Azure Function Locally

In your `az-func-template-py` repository:

```bash
# Install dependencies
pip install -r requirements.txt

# Start the function locally
func start
```

The function will run on `http://localhost:7071`

### 3. Run the React App

```bash
npm run dev
```

## Usage in Components

### Basic Usage with React Query Hook

```typescript
import { useForecast } from "@/hooks/useForecast";
import { toast } from "sonner";

function ForecastComponent() {
  const { mutate: runForecast, isLoading, data, error } = useForecast();

  const handleRunForecast = () => {
    runForecast(
      {
        config: forecastConfig,
        data: csvData,
      },
      {
        onSuccess: (results) => {
          toast.success("Forecast completed successfully!");
          console.log("Forecast results:", results);
        },
        onError: (error) => {
          toast.error(`Forecast failed: ${error.message}`);
        },
      }
    );
  };

  return (
    <div>
      <button onClick={handleRunForecast} disabled={isLoading}>
        {isLoading ? "Running forecast..." : "Run Forecast"}
      </button>

      {data && <ForecastResults results={data} />}
    </div>
  );
}
```

### Direct Service Usage (without React Query)

```typescript
import { azureFunctionService } from "@/services/azureFunctionService";

async function runCustomForecast() {
  try {
    const results = await azureFunctionService.runForecast(
      forecastConfig,
      csvData
    );
    console.log("Forecast results:", results);
  } catch (error) {
    console.error("Forecast error:", error);
  }
}
```

### Health Check

```typescript
import { azureFunctionService } from "@/services/azureFunctionService";

const isHealthy = await azureFunctionService.healthCheck();
if (!isHealthy) {
  toast.error("Azure Function is not responding");
}
```

## API Contract

### Request Format

```typescript
POST /api/forecast

{
  "config": {
    "model": "prophet" | "autogluon",
    "dateColumn": "date",
    "segmentColumn": "segment",
    "dependentVariable": "value",
    "segments": [...],
    "prophetParams": {...},
    "selectedMetrics": ["mae", "rmse", "r_squared"]
  },
  "data": [
    { "date": "2024-01-01", "value": 100, ... },
    ...
  ]
}
```

### Response Format

```typescript
{
  "success": true,
  "results": {
    "timestamp": "2024-01-01T12:00:00Z",
    "modelType": "prophet",
    "segmentResults": [
      {
        "segmentName": "Segment A",
        "frequency": "D",
        "forecastData": [...],
        "metrics": [...],
        "transformationsApplied": [...],
        "aiCommentary": "...",
        ...
      }
    ],
    "overallSummary": "..."
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": "Error message here"
}
```

## Configuration Options

### Timeout Configuration

Default timeout is 5 minutes (300,000ms). To customize:

```typescript
import { AzureFunctionService } from "@/services/azureFunctionService";

const customService = new AzureFunctionService({
  baseUrl: "http://localhost:7071/api",
  timeout: 600000, // 10 minutes
});
```

### Dynamic URL Updates

Switch between environments:

```typescript
import { azureFunctionService } from "@/services/azureFunctionService";

// Switch to production
azureFunctionService.setBaseUrl(
  "https://your-app.azurewebsites.net/api"
);

// Switch back to local
azureFunctionService.setBaseUrl("http://localhost:7071/api");
```

## Deployment

### Azure Function Deployment

1. **Via Azure CLI:**
   ```bash
   func azure functionapp publish your-function-app-name
   ```

2. **Via GitHub Actions:**
   Set up CI/CD pipeline in your `az-func-template-py` repo

3. **Update Frontend Environment:**
   ```bash
   # Production .env
   VITE_AZURE_FUNCTION_URL=https://your-app.azurewebsites.net/api
   ```

### Frontend Deployment

Update the environment variable in your hosting platform (Vercel, Netlify, etc.):
- Variable: `VITE_AZURE_FUNCTION_URL`
- Value: `https://your-app.azurewebsites.net/api`

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your Azure Function has CORS configured to allow your frontend domain
   - In local development, both should run on localhost

2. **Timeout Errors**
   - Increase timeout in service configuration
   - Check Azure Function logs for performance issues

3. **Connection Refused**
   - Verify Azure Function is running (`func start`)
   - Check the URL in `.env` matches the running function

4. **Authentication Errors**
   - If using Azure Function authentication, add auth headers to requests

### Debug Mode

Check service configuration:
```typescript
import { azureFunctionService } from "@/services/azureFunctionService";

console.log("Current config:", azureFunctionService.getConfig());
```

## Files Created

- [`src/services/azureFunctionService.ts`](../src/services/azureFunctionService.ts) - Core API service
- [`src/hooks/useForecast.ts`](../src/hooks/useForecast.ts) - React Query hook
- [`.env.example`](../.env.example) - Environment variable template
- [`.env`](../.env) - Your environment configuration
