# Auto-Prophet-Tune

A professional-grade web application for advanced time series forecasting and model analysis. Configure and run Prophet and AutoGluon forecasting models with sophisticated hyperparameter tuning, data transformation analysis, and multi-segment forecasting with comprehensive performance metrics.

## Features

- **CSV Data Upload** - Drag-and-drop file upload with automatic column detection
- **Multi-Segment Forecasting** - Handle different time series segments independently
- **Multiple Models** - Support for Prophet, AutoGluon, ARIMA, AR, and ARMA
- **AI-Powered Analysis** - Intelligent transformation recommendations (log, differencing, etc.)
- **Hyperparameter Tuning** - Advanced Prophet parameter configuration
- **Performance Metrics** - Calculate MAE, RMSE, MAPE, SMAPE, R^2, Adjusted R^2, Coverage, MASE
- **Export Results** - Download forecasts in CSV, HTML, and PDF formats

## 9-Step Workflow

1. **Upload** - Upload your time series CSV data
2. **Model** - Select your forecasting model (Prophet/AutoGluon)
3. **Variables** - Configure date, segment, and dependent variable columns
4. **Segments** - Set up train/test splits and forecast periods
5. **Analysis** - Run AI-powered data transformation analysis
6. **Regressors** - Configure external regressor variables
7. **Metrics** - Select which performance metrics to calculate
8. **Parameters** - Fine-tune model hyperparameters
9. **Results** - View forecasts, metrics, and export results

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn-ui components
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites
- Node.js 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd auto-prophet-tune

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── pages/              # Route pages (Index, Auth, NotFound)
├── components/
│   ├── ui/            # shadcn-ui base components
│   └── forecast/      # Domain-specific forecast components
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── hooks/             # Custom React hooks
├── lib/               # Library utilities
└── integrations/      # External service integrations

supabase/
├── functions/         # Deno edge functions
└── migrations/        # Database migrations
```

## Claude Code Integration

This project includes Claude Code configuration for AI-assisted development:

- `CLAUDE.md` - Project documentation for Claude
- `.claude/settings.json` - Claude Code permissions
- `.claude/commands/` - Custom slash commands:
  - `/dev` - Start development server
  - `/build` - Build the project
  - `/lint` - Run linting
  - `/add-forecast-component` - Guide for new components
  - `/add-ui-component` - Add shadcn-ui components
  - `/types` - Show type information
  - `/structure` - Show project structure
  - `/supabase` - Supabase integration help

## License

Private project - All rights reserved.

---

Built with [Lovable](https://lovable.dev)
