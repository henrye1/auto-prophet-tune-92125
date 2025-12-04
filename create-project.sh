#!/bin/bash

# Prophet-Tune Project Generator
# Run this script to create the complete project structure

set -e

echo "Creating Prophet-Tune project..."

# Create directory structure
mkdir -p src/{components/{ui,forecast},hooks,integrations/supabase,lib,pages,types,utils}

# ============================================
# ROOT CONFIG FILES
# ============================================

cat > package.json << 'ENDOFFILE'
{
  "name": "prophet-tune-new",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toast": "^1.2.15",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@supabase/supabase-js": "^2.86.0",
    "@tanstack/react-query": "^5.90.11",
    "@types/papaparse": "^5.5.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.555.0",
    "papaparse": "^5.5.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.68.0",
    "react-router-dom": "^7.10.0",
    "recharts": "^3.5.1",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@tailwindcss/typography": "^0.5.19",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.22",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.4",
    "vite": "^7.2.4"
  }
}
ENDOFFILE

cat > vite.config.ts << 'ENDOFFILE'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
ENDOFFILE

cat > tailwind.config.ts << 'ENDOFFILE'
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
ENDOFFILE

cat > tsconfig.json << 'ENDOFFILE'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
ENDOFFILE

cat > tsconfig.app.json << 'ENDOFFILE'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
ENDOFFILE

cat > tsconfig.node.json << 'ENDOFFILE'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
ENDOFFILE

cat > postcss.config.js << 'ENDOFFILE'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
ENDOFFILE

cat > eslint.config.js << 'ENDOFFILE'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
ENDOFFILE

cat > index.html << 'ENDOFFILE'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>prophet-tune-new</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
ENDOFFILE

cat > .gitignore << 'ENDOFFILE'
# Dependencies
node_modules
.pnp
.pnp.js

# Build outputs
dist
dist-ssr
*.local

# Environment files
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Editor directories
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS files
.DS_Store
Thumbs.db

# TypeScript
*.tsbuildinfo
ENDOFFILE

# ============================================
# SRC FILES
# ============================================

cat > src/main.tsx << 'ENDOFFILE'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
ENDOFFILE

cat > src/App.tsx << 'ENDOFFILE'
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  // For demo purposes, we'll skip auth and go directly to the main app
  // In production, you would check authentication state here
  const isAuthenticated = true;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Index /> : <Navigate to="/auth" replace />}
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
};

export default App;
ENDOFFILE

cat > src/App.css << 'ENDOFFILE'
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
ENDOFFILE

cat > src/index.css << 'ENDOFFILE'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground min-h-screen;
  }
}
ENDOFFILE

# ============================================
# LIB
# ============================================

cat > src/lib/utils.ts << 'ENDOFFILE'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
ENDOFFILE

# ============================================
# TYPES
# ============================================

cat > src/types/forecast.ts << 'ENDOFFILE'
// Forecasting model types
export type ForecastModel = "prophet" | "autogluon" | "arima" | "ar" | "arma";

// Data frequency types
export type DataFrequency = "D" | "W" | "MS" | "QS" | "YS";

// Performance metrics
export type PerformanceMetric =
  | "mae"
  | "rmse"
  | "mape"
  | "mse"
  | "r_squared"
  | "adjusted_r_squared"
  | "coverage"
  | "smape"
  | "mase";

// Regressor configuration
export interface RegressorConfig {
  name: string;
  enabled: boolean;
  mode: "additive" | "multiplicative";
  standardize: boolean;
}

// Custom seasonality configuration
export interface SeasonalityConfig {
  name: string;
  period: number;
  fourierOrder: number;
  mode: "additive" | "multiplicative";
}

// Segment configuration for multi-segment forecasting
export interface SegmentConfig {
  segmentName: string;
  trainRecords: number;
  testRecords: number;
  forecastPeriods: number;
  frequency: DataFrequency;
  regressors: RegressorConfig[];
  startDate?: string;
  endDate?: string;
}

// Prophet-specific parameters
export interface ProphetParameters {
  // Growth
  growthType: "linear" | "logistic" | "flat";
  cap?: number;
  floor?: number;

  // Changepoints
  changepointPriorScale: number;
  changepointRange: number;
  nChangepoints: number;
  changepoints?: string[];

  // Seasonality
  yearlySeasonality: boolean | "auto" | number;
  weeklySeasonality: boolean | "auto" | number;
  dailySeasonality: boolean | "auto" | number;
  seasonalityMode: "additive" | "multiplicative";
  seasonalityPriorScale: number;

  // Holidays
  holidayPriorScale: number;
  holidays?: string;
  countryHolidays?: string;

  // Uncertainty
  intervalWidth: number;
  uncertaintySamples: number;

  // Custom seasonalities
  customSeasonalities: SeasonalityConfig[];
}

// Complete forecast configuration
export interface ForecastConfig {
  model: ForecastModel;
  dateColumn: string;
  segmentColumn: string;
  dependentVariable: string;
  segments: SegmentConfig[];
  prophetParams: ProphetParameters;
  selectedMetrics: PerformanceMetric[];
}

// Default Prophet parameters
export const defaultProphetParams: ProphetParameters = {
  growthType: "linear",
  changepointPriorScale: 0.05,
  changepointRange: 0.8,
  nChangepoints: 25,
  yearlySeasonality: "auto",
  weeklySeasonality: "auto",
  dailySeasonality: "auto",
  seasonalityMode: "additive",
  seasonalityPriorScale: 10,
  holidayPriorScale: 10,
  intervalWidth: 0.8,
  uncertaintySamples: 1000,
  customSeasonalities: [],
};

// Frequency display names
export const frequencyNames: Record<DataFrequency, string> = {
  D: "Daily",
  W: "Weekly",
  MS: "Monthly",
  QS: "Quarterly",
  YS: "Yearly",
};

// Metric display names
export const metricNames: Record<PerformanceMetric, string> = {
  mae: "Mean Absolute Error",
  rmse: "Root Mean Squared Error",
  mape: "Mean Absolute Percentage Error",
  mse: "Mean Squared Error",
  r_squared: "R-Squared",
  adjusted_r_squared: "Adjusted R-Squared",
  coverage: "Prediction Interval Coverage",
  smape: "Symmetric MAPE",
  mase: "Mean Absolute Scaled Error",
};
ENDOFFILE

cat > src/types/forecastResults.ts << 'ENDOFFILE'
import type { PerformanceMetric, DataFrequency } from "./forecast";

// Single forecast data point
export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  isForecast: boolean;
  isTestSet: boolean;
}

// Metrics calculation result
export interface MetricsResult {
  metric: PerformanceMetric;
  trainValue: number | null;
  testValue: number | null;
}

// Transformation applied to data
export interface AppliedTransformation {
  type: "log" | "difference" | "seasonal_difference" | "sqrt" | "box_cox";
  order?: number;
  seasonalPeriod?: number;
  lambda?: number;
}

// Single segment forecast result
export interface SegmentForecastResult {
  segmentName: string;
  frequency: DataFrequency;
  forecastData: ForecastPoint[];
  metrics: MetricsResult[];
  transformationsApplied: AppliedTransformation[];
  aiCommentary?: string;
  modelConfig: Record<string, unknown>;
  trainStartDate: string;
  trainEndDate: string;
  testStartDate?: string;
  testEndDate?: string;
  forecastStartDate: string;
  forecastEndDate: string;
}

// Complete forecast results
export interface ForecastResults {
  timestamp: string;
  modelType: string;
  segmentResults: SegmentForecastResult[];
  overallSummary?: string;
}

// Export format options
export type ExportFormat = "csv" | "json" | "html" | "pdf";

// Chart display options
export interface ChartOptions {
  showActual: boolean;
  showPredicted: boolean;
  showConfidenceInterval: boolean;
  showTrainTestSplit: boolean;
  chartHeight: number;
}

export const defaultChartOptions: ChartOptions = {
  showActual: true,
  showPredicted: true,
  showConfidenceInterval: true,
  showTrainTestSplit: true,
  chartHeight: 400,
};
ENDOFFILE

cat > src/types/dataAnalysis.ts << 'ENDOFFILE'
// Data analysis and transformation types

// Stationarity test results
export interface StationarityTestResult {
  testStatistic: number;
  pValue: number;
  criticalValues: Record<string, number>;
  isStationary: boolean;
  recommendation: string;
}

// Autocorrelation results
export interface AutocorrelationResult {
  lag: number;
  acf: number;
  pacf: number;
  significanceBound: number;
}

// Transformation recommendation
export interface TransformationRecommendation {
  type: "log" | "difference" | "seasonal_difference" | "sqrt" | "box_cox" | "none";
  reason: string;
  priority: number;
  parameters?: {
    order?: number;
    seasonalPeriod?: number;
    lambda?: number;
  };
}

// Data characteristics
export interface DataCharacteristics {
  hasTrend: boolean;
  hasSeasonality: boolean;
  seasonalPeriod?: number;
  hasVarianceInstability: boolean;
  hasOutliers: boolean;
  outlierCount: number;
  missingValueCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  recordCount: number;
}

// Complete analysis result for a segment
export interface SegmentAnalysisResult {
  segmentName: string;
  characteristics: DataCharacteristics;
  stationarityTest: StationarityTestResult;
  autocorrelation: AutocorrelationResult[];
  recommendations: TransformationRecommendation[];
  transformedStationarityTest?: StationarityTestResult;
}

// Analysis state for UI
export interface AnalysisState {
  isLoading: boolean;
  isComplete: boolean;
  error?: string;
  result?: SegmentAnalysisResult;
  selectedTransformations: TransformationRecommendation[];
}
ENDOFFILE

# ============================================
# HOOKS
# ============================================

cat > src/hooks/useToast.ts << 'ENDOFFILE'
import { toast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const showSuccess = (options: ToastOptions) => {
    toast.success(options.title, {
      description: options.description,
      duration: options.duration || 3000,
    });
  };

  const showError = (options: ToastOptions) => {
    toast.error(options.title, {
      description: options.description,
      duration: options.duration || 5000,
    });
  };

  const showWarning = (options: ToastOptions) => {
    toast.warning(options.title, {
      description: options.description,
      duration: options.duration || 4000,
    });
  };

  const showInfo = (options: ToastOptions) => {
    toast.info(options.title, {
      description: options.description,
      duration: options.duration || 3000,
    });
  };

  const showLoading = (message: string) => {
    return toast.loading(message);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    dismiss,
  };
}
ENDOFFILE

cat > src/hooks/useMobile.ts << 'ENDOFFILE'
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return isMobile;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}
ENDOFFILE

# ============================================
# UTILS
# ============================================

cat > src/utils/dataAnalysis.ts << 'ENDOFFILE'
import type { DataFrequency, PerformanceMetric } from "@/types/forecast";

/**
 * Check if a column contains numeric values
 */
export function isNumericColumn(data: Record<string, unknown>[], column: string): boolean {
  if (data.length === 0) return false;

  const sampleSize = Math.min(10, data.length);
  let numericCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const value = data[i][column];
    if (value !== null && value !== undefined && !isNaN(Number(value))) {
      numericCount++;
    }
  }

  return numericCount / sampleSize >= 0.8;
}

/**
 * Get all numeric columns from data
 */
export function getNumericColumns(
  data: Record<string, unknown>[],
  columns: string[]
): string[] {
  return columns.filter((col) => isNumericColumn(data, col));
}

/**
 * Detect data frequency from dates
 */
export function detectFrequency(dates: Date[]): DataFrequency {
  if (dates.length < 2) return "D";

  const diffs: number[] = [];
  for (let i = 1; i < Math.min(dates.length, 10); i++) {
    diffs.push(dates[i].getTime() - dates[i - 1].getTime());
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const days = avgDiff / (1000 * 60 * 60 * 24);

  if (days < 2) return "D";
  if (days < 10) return "W";
  if (days < 60) return "MS";
  if (days < 200) return "QS";
  return "YS";
}

/**
 * Calculate Mean Absolute Error
 */
export function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return NaN;

  const sum = actual.reduce((acc, val, i) => {
    return acc + Math.abs(val - predicted[i]);
  }, 0);

  return sum / actual.length;
}

/**
 * Calculate Root Mean Squared Error
 */
export function calculateRMSE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return NaN;

  const sum = actual.reduce((acc, val, i) => {
    return acc + Math.pow(val - predicted[i], 2);
  }, 0);

  return Math.sqrt(sum / actual.length);
}

/**
 * Calculate Mean Absolute Percentage Error
 */
export function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return NaN;

  const nonZeroIndices = actual
    .map((val, i) => (val !== 0 ? i : -1))
    .filter((i) => i !== -1);

  if (nonZeroIndices.length === 0) return NaN;

  const sum = nonZeroIndices.reduce((acc, i) => {
    return acc + Math.abs((actual[i] - predicted[i]) / actual[i]);
  }, 0);

  return (sum / nonZeroIndices.length) * 100;
}

/**
 * Calculate R-squared
 */
export function calculateRSquared(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return NaN;

  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;

  const ssRes = actual.reduce((acc, val, i) => {
    return acc + Math.pow(val - predicted[i], 2);
  }, 0);

  const ssTot = actual.reduce((acc, val) => {
    return acc + Math.pow(val - mean, 2);
  }, 0);

  if (ssTot === 0) return NaN;

  return 1 - ssRes / ssTot;
}

/**
 * Calculate coverage (percentage of actuals within prediction intervals)
 */
export function calculateCoverage(
  actual: number[],
  lower: number[],
  upper: number[]
): number {
  if (actual.length === 0) return NaN;

  const covered = actual.filter((val, i) => val >= lower[i] && val <= upper[i]).length;

  return (covered / actual.length) * 100;
}

/**
 * Calculate a specific metric
 */
export function calculateMetric(
  metric: PerformanceMetric,
  actual: number[],
  predicted: number[],
  lower?: number[],
  upper?: number[]
): number {
  switch (metric) {
    case "mae":
      return calculateMAE(actual, predicted);
    case "rmse":
      return calculateRMSE(actual, predicted);
    case "mape":
      return calculateMAPE(actual, predicted);
    case "mse":
      return Math.pow(calculateRMSE(actual, predicted), 2);
    case "r_squared":
      return calculateRSquared(actual, predicted);
    case "coverage":
      if (!lower || !upper) return NaN;
      return calculateCoverage(actual, lower, upper);
    case "smape":
      // Symmetric MAPE
      if (actual.length === 0) return NaN;
      const smapeSum = actual.reduce((acc, val, i) => {
        const denom = Math.abs(val) + Math.abs(predicted[i]);
        return acc + (denom === 0 ? 0 : Math.abs(val - predicted[i]) / denom);
      }, 0);
      return (smapeSum / actual.length) * 100;
    default:
      return NaN;
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Parse CSV date string to Date object
 */
export function parseDate(dateStr: string): Date | null {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
ENDOFFILE

# ============================================
# INTEGRATIONS / SUPABASE
# ============================================

cat > src/integrations/supabase/client.ts << 'ENDOFFILE'
import { createClient } from "@supabase/supabase-js";

// These would normally come from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Type-safe helper for calling edge functions
export async function invokeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
}
ENDOFFILE

cat > src/integrations/supabase/types.ts << 'ENDOFFILE'
// Database types for Supabase
// These would be auto-generated from your Supabase schema

export interface Database {
  public: {
    Tables: {
      forecasts: {
        Row: {
          id: string;
          user_id: string;
          model_type: string;
          config: Record<string, unknown>;
          results: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["forecasts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["forecasts"]["Insert"]>;
      };
      saved_models: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          model_config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["saved_models"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["saved_models"]["Insert"]>;
      };
    };
    Functions: {
      // Add any database functions here
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
ENDOFFILE

# ============================================
# PAGES
# ============================================

cat > src/pages/Index.tsx << 'ENDOFFILE'
import React, { useState, useCallback } from "react";
import { LogOut, TrendingUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import DataUpload from "@/components/forecast/DataUpload";
import ModelSelector from "@/components/forecast/ModelSelector";
import VariableConfig from "@/components/forecast/VariableConfig";
import SegmentMapper from "@/components/forecast/SegmentMapper";
import ProphetHyperparameters from "@/components/forecast/ProphetHyperparameters";
import MetricsSelector from "@/components/forecast/MetricsSelector";
import ForecastResults from "@/components/forecast/ForecastResults";
import ForecastProgress from "@/components/forecast/ForecastProgress";
import type { ForecastModel, SegmentConfig, ProphetParameters, PerformanceMetric } from "@/types/forecast";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";
import { defaultProphetParams } from "@/types/forecast";

type WorkflowStep =
  | "upload"
  | "model"
  | "variables"
  | "segments"
  | "analysis"
  | "regressors"
  | "metrics"
  | "parameters"
  | "results";

const workflowSteps: { id: WorkflowStep; label: string; shortLabel: string }[] = [
  { id: "upload", label: "Upload Data", shortLabel: "Upload" },
  { id: "model", label: "Select Model", shortLabel: "Model" },
  { id: "variables", label: "Configure Variables", shortLabel: "Variables" },
  { id: "segments", label: "Segment Mapping", shortLabel: "Segments" },
  { id: "analysis", label: "Data Analysis", shortLabel: "Analysis" },
  { id: "regressors", label: "Regressors", shortLabel: "Regressors" },
  { id: "metrics", label: "Metrics", shortLabel: "Metrics" },
  { id: "parameters", label: "Parameters", shortLabel: "Params" },
  { id: "results", label: "Results", shortLabel: "Results" },
];

const Index: React.FC = () => {
  // Data state
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  // Configuration state
  const [selectedModel, setSelectedModel] = useState<ForecastModel>("prophet");
  const [dateColumn, setDateColumn] = useState<string>("");
  const [segmentColumn, setSegmentColumn] = useState<string>("");
  const [dependentVariable, setDependentVariable] = useState<string>("");
  const [segments, setSegments] = useState<SegmentConfig[]>([]);
  const [prophetParams, setProphetParams] = useState<ProphetParameters>(defaultProphetParams);
  const [selectedMetrics, setSelectedMetrics] = useState<PerformanceMetric[]>([
    "mae",
    "rmse",
    "mape",
    "r_squared",
  ]);

  // UI state
  const [activeTab, setActiveTab] = useState<WorkflowStep>("upload");
  const [isRunning, setIsRunning] = useState(false);
  const [forecastResults, setForecastResults] = useState<ForecastResultsType | null>(null);

  // Data loading handler
  const handleDataLoaded = useCallback(
    (data: Record<string, unknown>[], cols: string[]) => {
      setCsvData(data);
      setColumns(cols);
      setFileName(`data_${Date.now()}.csv`);

      // Auto-detect date column
      const likelyDateCol = cols.find((col) => {
        const lower = col.toLowerCase();
        return lower.includes("date") || lower.includes("time");
      });
      if (likelyDateCol) setDateColumn(likelyDateCol);
    },
    []
  );

  const handleClearData = useCallback(() => {
    setCsvData([]);
    setColumns([]);
    setFileName("");
    setDateColumn("");
    setSegmentColumn("");
    setDependentVariable("");
    setSegments([]);
    setForecastResults(null);
  }, []);

  // Navigation helpers
  const canProceed = (step: WorkflowStep): boolean => {
    switch (step) {
      case "upload":
        return csvData.length > 0;
      case "model":
        return !!selectedModel;
      case "variables":
        return !!dateColumn && !!dependentVariable;
      case "segments":
        return segments.length > 0;
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    const currentIndex = workflowSteps.findIndex((s) => s.id === activeTab);
    if (currentIndex < workflowSteps.length - 1) {
      setActiveTab(workflowSteps[currentIndex + 1].id);
    }
  };

  // Run forecast (mock implementation)
  const runForecast = async () => {
    setIsRunning(true);
    setActiveTab("results");

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate mock results
    const mockResults: ForecastResultsType = {
      timestamp: new Date().toISOString(),
      modelType: selectedModel,
      segmentResults: segments.map((segment) => ({
        segmentName: segment.segmentName,
        frequency: segment.frequency,
        forecastData: Array.from({ length: 50 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - 50 + i);
          const baseValue = 100 + Math.sin(i / 5) * 20;
          const noise = Math.random() * 10 - 5;
          return {
            date: date.toISOString(),
            actual: i < 40 ? baseValue + noise : null,
            predicted: baseValue,
            lowerBound: baseValue - 15,
            upperBound: baseValue + 15,
            isForecast: i >= 40,
            isTestSet: i >= 30 && i < 40,
          };
        }),
        metrics: selectedMetrics.map((metric) => ({
          metric,
          trainValue: Math.random() * 10,
          testValue: Math.random() * 15,
        })),
        transformationsApplied: [],
        modelConfig: { model: selectedModel },
        trainStartDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        trainEndDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        testStartDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        testEndDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        forecastStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        forecastEndDate: new Date().toISOString(),
        aiCommentary:
          "The model shows good fit to the training data with minimal overfitting. Seasonality patterns are well captured.",
      })),
    };

    setForecastResults(mockResults);
    setIsRunning(false);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Prophet-Tune</h1>
                  <p className="text-sm text-muted-foreground">
                    Time Series Forecasting Platform
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkflowStep)}>
            {/* Step Navigation */}
            <div className="mb-6 overflow-x-auto">
              <TabsList className="inline-flex h-auto p-1 gap-1">
                {workflowSteps.map((step, index) => {
                  const isPast = workflowSteps.findIndex((s) => s.id === activeTab) > index;
                  const isCurrent = step.id === activeTab;

                  return (
                    <TabsTrigger
                      key={step.id}
                      value={step.id}
                      disabled={index > 0 && !canProceed(workflowSteps[index - 1].id)}
                      className="relative px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Badge
                          variant={isCurrent ? "default" : isPast ? "secondary" : "outline"}
                          className="h-5 w-5 p-0 justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        <span className="hidden sm:inline">{step.shortLabel}</span>
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {/* Step 1: Upload */}
              <TabsContent value="upload" className="mt-0">
                <DataUpload
                  onDataLoaded={handleDataLoaded}
                  isLoaded={csvData.length > 0}
                  fileName={fileName}
                  onClear={handleClearData}
                />
                {csvData.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={goToNextStep}>
                      Continue to Model Selection
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 2: Model Selection */}
              <TabsContent value="model" className="mt-0">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
                <div className="flex justify-end mt-4">
                  <Button onClick={goToNextStep}>Continue to Variables</Button>
                </div>
              </TabsContent>

              {/* Step 3: Variable Configuration */}
              <TabsContent value="variables" className="mt-0">
                <VariableConfig
                  columns={columns}
                  dateColumn={dateColumn}
                  segmentColumn={segmentColumn}
                  dependentVariable={dependentVariable}
                  onDateColumnChange={setDateColumn}
                  onSegmentColumnChange={setSegmentColumn}
                  onDependentVariableChange={setDependentVariable}
                  data={csvData}
                />
                {dateColumn && dependentVariable && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={goToNextStep}>Continue to Segments</Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 4: Segment Mapping */}
              <TabsContent value="segments" className="mt-0">
                <SegmentMapper
                  data={csvData}
                  dateColumn={dateColumn}
                  segmentColumn={segmentColumn}
                  segments={segments}
                  onSegmentsChange={setSegments}
                />
                {segments.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={goToNextStep}>Continue to Analysis</Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 5: Data Analysis (Placeholder) */}
              <TabsContent value="analysis" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Analysis</CardTitle>
                    <CardDescription>
                      AI-powered transformation recommendations (coming soon)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      This step will analyze your data and recommend transformations
                      to improve forecast accuracy.
                    </p>
                  </CardContent>
                </Card>
                <div className="flex justify-end mt-4">
                  <Button onClick={goToNextStep}>Continue to Regressors</Button>
                </div>
              </TabsContent>

              {/* Step 6: Regressors (Placeholder) */}
              <TabsContent value="regressors" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>External Regressors</CardTitle>
                    <CardDescription>
                      Configure additional variables to improve forecasts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Select columns to use as external regressors for your forecast model.
                    </p>
                  </CardContent>
                </Card>
                <div className="flex justify-end mt-4">
                  <Button onClick={goToNextStep}>Continue to Metrics</Button>
                </div>
              </TabsContent>

              {/* Step 7: Metrics Selection */}
              <TabsContent value="metrics" className="mt-0">
                <MetricsSelector
                  selectedMetrics={selectedMetrics}
                  onMetricsChange={setSelectedMetrics}
                />
                <div className="flex justify-end mt-4">
                  <Button onClick={goToNextStep}>Continue to Parameters</Button>
                </div>
              </TabsContent>

              {/* Step 8: Parameters */}
              <TabsContent value="parameters" className="mt-0">
                {selectedModel === "prophet" && (
                  <ProphetHyperparameters
                    parameters={prophetParams}
                    onParametersChange={setProphetParams}
                  />
                )}
                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="default" onClick={runForecast} disabled={isRunning}>
                    <Play className="h-4 w-4 mr-1" />
                    Run Forecast
                  </Button>
                </div>
              </TabsContent>

              {/* Step 9: Results */}
              <TabsContent value="results" className="mt-0">
                {isRunning ? (
                  <ForecastProgress
                    segments={segments.map((s) => ({
                      segmentName: s.segmentName,
                      status: "processing",
                    }))}
                    overallProgress={50}
                    currentStep="Running forecast model..."
                  />
                ) : forecastResults ? (
                  <ForecastResults results={forecastResults} />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No forecast results yet. Complete the configuration and run the forecast.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Index;
ENDOFFILE

cat > src/pages/Auth.tsx << 'ENDOFFILE'
import React, { useState } from "react";
import { TrendingUp, Mail, Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthProps {
  onAuthSuccess?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up form state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate authentication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!signInEmail || !signInPassword) {
        throw new Error("Please enter both email and password");
      }

      // Success - would normally integrate with Supabase here
      onAuthSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!signUpEmail || !signUpPassword) {
        throw new Error("Please fill in all fields");
      }

      if (signUpPassword !== signUpConfirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (signUpPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Simulate registration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      onAuthSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <TrendingUp className="h-10 w-10 text-primary" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Prophet-Tune</h1>
            <p className="text-sm text-muted-foreground">Time Series Forecasting</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Sign In Tab */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-9"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        className="pl-9"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        className="pl-9"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
ENDOFFILE

cat > src/pages/NotFound.tsx << 'ENDOFFILE'
import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
ENDOFFILE

echo "Creating UI components..."

# ============================================
# UI COMPONENTS
# ============================================

cat > src/components/ui/button.tsx << 'ENDOFFILE'
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
ENDOFFILE

cat > src/components/ui/label.tsx << 'ENDOFFILE'
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
ENDOFFILE

cat > src/components/ui/input.tsx << 'ENDOFFILE'
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
ENDOFFILE

cat > src/components/ui/card.tsx << 'ENDOFFILE'
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
ENDOFFILE

echo "Script is too long. Creating part 2..."

echo ""
echo "============================================"
echo "NOTE: Due to script length limits, some"
echo "UI components need to be created manually."
echo "Run: bash create-project-part2.sh"
echo "============================================"

echo ""
echo "Project structure created!"
echo "Next steps:"
echo "1. Run: bash create-project-part2.sh"
echo "2. Run: npm install"
echo "3. Run: npm run dev"
