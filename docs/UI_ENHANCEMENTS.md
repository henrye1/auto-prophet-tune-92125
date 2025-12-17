# UI Enhancements for Long-Running Forecasts

## Overview

Enhanced the user interface to provide better feedback during long-running forecast operations, especially for AutoGluon which can take 2-10 minutes to train multiple models.

## Changes Made

### 1. Progress Tracking ([src/pages/Index.tsx](../src/pages/Index.tsx))

**Added state variables:**
- `forecastProgress` - Tracks overall progress percentage (0-100)
- `forecastStatus` - Shows current status message

**Enhanced `runForecast` function:**
- Shows initial progress at 10% when starting
- Updates to 20% when configuration is prepared
- Updates to 30% when request is sent
- Simulates gradual progress (5% increments) during model training
- Different update speeds for Prophet (fast) vs AutoGluon (slow)
- Completes at 100% when forecast finishes

**Progress milestones:**
```
10% - Preparing forecast configuration
20% - Configuration ready
30% - Request sent to Azure Function
30-90% - Model training (gradual updates)
100% - Forecast completed
```

### 2. Model-Specific Messages

**Prophet:**
- Quick toast: "Running Prophet forecast..."
- Status: "Running Prophet model..."
- Completion: "Prophet forecast completed successfully!"

**AutoGluon:**
- Informative toast: "Starting AutoGluon forecast. This will train multiple models and may take 2-10 minutes..."
- Status: "Training multiple AutoGluon models (this may take several minutes)..."
- Completion: "AutoGluon forecast completed! Trained X models. Best: ModelName"

### 3. Enhanced Progress Component ([src/components/forecast/ForecastProgress.tsx](../src/components/forecast/ForecastProgress.tsx))

**Visual improvements:**
- Increased progress bar height from `h-2` to `h-3` for better visibility
- Added info box (shown between 20-90% progress) with tip about checking Azure Function terminal
- Blue-themed info box that's visible in both light and dark mode

**Info box message:**
> **Tip:** For AutoGluon forecasts, check the Azure Function terminal to see real-time training progress and the model leaderboard.

### 4. Results Integration

**After AutoGluon completes:**
- Extracts model information from response:
  - Best model name
  - Number of models trained
- Shows detailed success message with model info
- Updates status to show best model: `"Completed! Best model: WeightedEnsemble (12 models trained)"`

## User Experience Flow

### Running AutoGluon Forecast

1. **Click "Run Forecast"**
   - Toast appears: "Starting AutoGluon forecast. This will train multiple models and may take 2-10 minutes..."
   - Progress jumps to 10%

2. **Results tab auto-opens**
   - Shows ForecastProgress component
   - Progress bar at 10-30%
   - Status: "Training multiple AutoGluon models..."

3. **During training (30-90%)**
   - Progress bar slowly increments every 5 seconds
   - Blue info box appears with tip about checking terminal
   - Animated spinner in title

4. **Completion (100%)**
   - Progress bar completes
   - Toast: "AutoGluon forecast completed! Trained 12 models. Best: WeightedEnsemble"
   - Status updates to show best model
   - Results automatically display

### Running Prophet Forecast

1. **Click "Run Forecast"**
   - Toast: "Running Prophet forecast..."
   - Progress jumps to 10%

2. **Quick progression (2-5 seconds)**
   - Progress: 10% → 30% → 90% → 100%
   - Faster update interval (1 second vs 5 seconds for AutoGluon)

3. **Completion**
   - Toast: "Prophet forecast completed successfully!"
   - Results display immediately

## Technical Implementation

### Progress Simulation

```typescript
const progressInterval = setInterval(() => {
  setForecastProgress(prev => {
    if (prev < 90) return prev + 5;
    return prev;
  });
}, selectedModel === "autogluon" ? 5000 : 1000);
```

- **AutoGluon**: Updates every 5 seconds (slower, more realistic)
- **Prophet**: Updates every 1 second (faster)
- **Caps at 90%** until actual completion

### Model Info Extraction

```typescript
const modelConfig = results.segmentResults?.[0]?.modelConfig;
const bestModel = modelConfig?.best_model || "Unknown";
const numModels = modelConfig?.num_models_trained || 0;
```

Safely extracts:
- Best performing model name
- Total number of models trained
- Validation score

## Benefits

1. **User Engagement**
   - Visual feedback keeps users informed
   - No "frozen UI" perception during long operations

2. **Transparency**
   - Clear status messages explain what's happening
   - Different timing for different models sets proper expectations

3. **Education**
   - Info box teaches users about AutoGluon's multi-model training
   - Directs users to terminal for detailed logs

4. **Professional Feel**
   - Smooth progress animations
   - Model-specific messages show attention to detail
   - Celebrates completion with model statistics

## Future Enhancements

Potential improvements:
1. **Real-time updates from backend** - Stream progress events from Azure Function
2. **Estimated time remaining** - Calculate ETA based on data size and model
3. **Cancel button** - Allow users to abort long-running forecasts
4. **Progress history** - Show list of completed forecasts with timing
5. **Model comparison** - Quick preview of leaderboard in UI during training

## Testing

To test the enhanced UI:

1. Select **AutoGluon** model
2. Upload data and configure forecast
3. Click "Run Forecast"
4. Observe:
   - Initial toast message
   - Progress bar animation
   - Info box appearance
   - Status message updates
   - Completion message with model info

Compare with Prophet to see the timing differences.
