# Auto-Prophet-Tune: Time Series Forecasting Platform

## Project Overview

Auto-Prophet-Tune is a professional-grade web application for advanced time series forecasting and model analysis. It enables users to configure and run Prophet and AutoGluon forecasting models with sophisticated hyperparameter tuning, data transformation analysis, and multi-segment forecasting with performance metrics.

## Technology Stack

### Frontend
- **React 18.3** with TypeScript 5.8
- **Vite 5.4** for builds and HMR
- **Tailwind CSS 3.4** for styling
- **shadcn-ui** component library (50+ Radix UI components)
- **React Router 6** for routing
- **React Hook Form + Zod** for form validation
- **Recharts** for data visualization
- **TanStack React Query** for server state
- **PapaParse** for CSV parsing

### Backend
- **Supabase** for auth, database, and edge functions
- Edge functions written in **Deno**

## Project Structure

```
src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # React entry point
├── pages/
│   ├── Index.tsx              # Main forecasting dashboard (9-step workflow)
│   ├── Auth.tsx               # Authentication page
│   └── NotFound.tsx           # 404 page
├── components/
│   ├── ui/                    # shadcn-ui base components
│   └── forecast/              # Domain-specific components (18 files)
│       ├── DataUpload.tsx     # CSV file upload
│       ├── DataAnalysisTools.tsx  # AI transformation analysis
│       ├── ForecastResults.tsx    # Results visualization
│       ├── ProphetHyperparameters.tsx  # Parameter tuning
│       └── ...
├── types/
│   ├── forecast.ts            # Core type definitions
│   ├── forecastResults.ts     # Result data structures
│   └── dataAnalysis.ts        # Analysis types
├── utils/
│   └── dataAnalysis.ts        # Data processing utilities
├── hooks/                     # Custom React hooks
├── lib/
│   └── utils.ts               # General utilities (cn function)
└── integrations/
    └── supabase/              # Supabase client and types

supabase/
├── functions/                 # Edge Functions
│   ├── analyze-transformations/  # AI transformation recommendations
│   ├── statistical-tests/        # ADF, ACF, PACF tests
│   └── optimize-prophet-params/  # Parameter optimization
├── migrations/                # Database migrations
└── config.toml                # Supabase config
```

## Key Commands

```bash
# Development
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Application Workflow (9 Steps)

1. **Upload** - CSV file upload with drag-and-drop
2. **Model Selection** - Choose Prophet or AutoGluon
3. **Variable Config** - Select date, segment, dependent variable columns
4. **Segment Mapping** - Configure train/test splits per segment
5. **Data Analysis** - AI-recommended transformations (optional)
6. **Regressor Config** - Configure external variables
7. **Metrics Selection** - Choose performance metrics (MAE, RMSE, MAPE, etc.)
8. **Parameter Tuning** - Prophet hyperparameters
9. **Results** - View forecasts, metrics, and export

## Key Types

```typescript
// Forecast models
type ForecastModel = 'prophet' | 'autogluon' | 'arima' | 'ar' | 'arma';

// Performance metrics
type PerformanceMetric = 'mae' | 'rmse' | 'mape' | 'mse' | 'r_squared' |
                         'adjusted_r_squared' | 'coverage' | 'smape' | 'mase';

// Data frequency
type DataFrequency = 'D' | 'W' | 'MS' | 'QS' | 'YS';
```

## Code Patterns

### Component Structure
Components follow this pattern:
- Props interface defined at top
- Main component as default export
- shadcn-ui components for UI primitives
- Tailwind classes for styling

### State Management
- Local state (useState) for UI state
- React Query for server state
- Form state via React Hook Form

### Error Handling
- Toast notifications via Sonner
- Form validation with Zod schemas
- Try-catch in async operations

## UI Components Location

All shadcn-ui components are in `src/components/ui/`:
- `button.tsx`, `input.tsx`, `card.tsx`
- `dialog.tsx`, `form.tsx`, `select.tsx`
- `tabs.tsx`, `table.tsx`, etc.

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

## Testing Notes

Currently no test framework configured. When adding tests:
- Use Vitest (recommended for Vite projects)
- React Testing Library for component tests
- Mock Supabase client for integration tests

## Important Files to Know

| File | Purpose | Lines |
|------|---------|-------|
| `src/pages/Index.tsx` | Main dashboard orchestrating all features | ~1200 |
| `src/components/forecast/DataAnalysisTools.tsx` | AI transformation analysis | ~1400 |
| `src/components/forecast/ForecastResults.tsx` | Results visualization | ~800 |
| `src/components/forecast/ProphetHyperparameters.tsx` | Parameter tuning UI | ~470 |
| `src/types/forecast.ts` | Core type definitions | - |

## Common Development Tasks

### Adding a new forecast component
1. Create component in `src/components/forecast/`
2. Define props interface with TypeScript
3. Import and use in `src/pages/Index.tsx`
4. Add to appropriate tab in the workflow

### Modifying UI components
- Check if shadcn-ui component exists in `src/components/ui/`
- Customize via Tailwind classes or component variants
- For new shadcn components, use: `npx shadcn-ui@latest add <component>`

### Adding new edge functions
1. Create folder in `supabase/functions/<function-name>/`
2. Add `index.ts` with Deno serve handler
3. Call via `supabase.functions.invoke('<function-name>', { body: {...} })`
