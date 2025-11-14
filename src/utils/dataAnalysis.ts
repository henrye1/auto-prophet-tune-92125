/**
 * Analyze time series data for a segment
 */
export const analyzeSegmentData = (
  data: any[],
  segmentColumn: string,
  segmentValue: string,
  dateColumn: string
) => {
  // Filter data for this segment
  const segmentData = data.filter(row => row[segmentColumn] === segmentValue);
  
  // Sort by date
  const sortedData = [...segmentData].sort((a, b) => {
    const dateA = new Date(a[dateColumn]).getTime();
    const dateB = new Date(b[dateColumn]).getTime();
    return dateA - dateB;
  });

  const totalRecords = sortedData.length;

  // Auto-detect frequency by analyzing time differences
  let detectedFrequency = 'MS'; // Default to monthly
  
  if (sortedData.length >= 2) {
    const dates = sortedData.map(row => new Date(row[dateColumn]));
    const differences: number[] = [];
    
    for (let i = 1; i < Math.min(10, dates.length); i++) {
      const diffDays = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      differences.push(Math.round(diffDays));
    }
    
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    
    // Determine frequency based on average difference
    if (avgDiff <= 1.5) {
      detectedFrequency = 'D'; // Daily
    } else if (avgDiff <= 8) {
      detectedFrequency = 'W'; // Weekly
    } else if (avgDiff <= 20) {
      detectedFrequency = 'SMS'; // Semi-monthly
    } else if (avgDiff <= 35) {
      detectedFrequency = 'MS'; // Monthly start
    } else if (avgDiff <= 100) {
      detectedFrequency = 'QS'; // Quarterly
    } else {
      detectedFrequency = 'YS'; // Yearly
    }
  }

  // Get date range
  const firstDate = sortedData.length > 0 ? new Date(sortedData[0][dateColumn]) : null;
  const lastDate = sortedData.length > 0 ? new Date(sortedData[sortedData.length - 1][dateColumn]) : null;

  return {
    totalRecords,
    detectedFrequency,
    firstDate,
    lastDate,
    sortedData,
  };
};

/**
 * Get frequency display name
 */
export const getFrequencyName = (freq: string): string => {
  const names: Record<string, string> = {
    'D': 'Daily',
    'W': 'Weekly',
    'SMS': 'Semi-Monthly',
    'MS': 'Monthly',
    'QS': 'Quarterly',
    'YS': 'Yearly',
  };
  return names[freq] || freq;
};

/**
 * Calculate months between dates
 */
export const calculateMonthsObservable = (
  firstDate: Date | null,
  lastDate: Date | null,
  frequency: string
): number => {
  if (!firstDate || !lastDate) return 0;
  
  const yearsDiff = lastDate.getFullYear() - firstDate.getFullYear();
  const monthsDiff = lastDate.getMonth() - firstDate.getMonth();
  
  return yearsDiff * 12 + monthsDiff + 1;
};

/**
 * Apply a single transformation to data
 */
export const applyTransformation = (
  data: number[],
  transformation: string,
  parameters?: any
): number[] => {
  switch (transformation) {
    case 'log':
      return data.map(val => val > 0 ? Math.log(val) : NaN);
    case 'difference':
      return data.slice(1).map((val, i) => val - data[i]);
    case 'seasonal_difference':
      const period = parameters?.seasonal_period || 12;
      return data.slice(period).map((val, i) => val - data[i]);
    case 'box_cox':
      const lambda = parameters?.lambda || 0;
      if (lambda === 0) {
        return data.map(val => val > 0 ? Math.log(val) : NaN);
      }
      return data.map(val => val > 0 ? (Math.pow(val, lambda) - 1) / lambda : NaN);
    case 'standardize':
      // Z-score normalization: (x - mean) / std
      const validData = data.filter(val => !isNaN(val) && isFinite(val));
      const mean = validData.reduce((sum, val) => sum + val, 0) / validData.length;
      const variance = validData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validData.length;
      const std = Math.sqrt(variance);
      return data.map(val => std > 0 ? (val - mean) / std : 0);
    default:
      return data;
  }
};

/**
 * Apply multiple transformations in sequence
 */
export const applyTransformationChain = (
  data: number[],
  transformations: any[]
): number[] => {
  let transformed = [...data];
  for (const transform of transformations) {
    if (transform.type !== 'none') {
      transformed = applyTransformation(transformed, transform.type, transform.parameters);
    }
  }
  return transformed;
};

/**
 * Apply transformations from analysis state to CSV data
 */
export const applyAnalysisTransformations = (
  data: any[],
  dateColumn: string,
  dependentVariable: string,
  regressors: string[],
  analysisState: Record<string, any>
): { transformedData: any[]; transformationsSummary: string[] } => {
  const transformedData = [...data];
  const transformationsSummary: string[] = [];

  // Apply transformations to dependent variable
  if (analysisState?.dependent?.transformations && analysisState.dependent.transformations.length > 0) {
    const depTransforms = analysisState.dependent.transformations;
    const depValues = data.map(row => parseFloat(row[dependentVariable]));
    const transformedDepValues = applyTransformationChain(depValues, depTransforms);
    
    transformedData.forEach((row, i) => {
      row[dependentVariable] = transformedDepValues[i];
    });
    
    const transformNames = depTransforms.map((t: any) => t.type).filter((t: string) => t !== 'none').join(' → ');
    if (transformNames) {
      transformationsSummary.push(`${dependentVariable}: ${transformNames}`);
    }
  }

  // Apply transformations to regressors
  regressors.forEach(regressor => {
    if (analysisState?.[regressor]?.transformations && analysisState[regressor].transformations.length > 0) {
      const regTransforms = analysisState[regressor].transformations;
      const regValues = data.map(row => parseFloat(row[regressor]));
      const transformedRegValues = applyTransformationChain(regValues, regTransforms);
      
      transformedData.forEach((row, i) => {
        row[regressor] = transformedRegValues[i];
      });
      
      const transformNames = regTransforms.map((t: any) => t.type).filter((t: string) => t !== 'none').join(' → ');
      if (transformNames) {
        transformationsSummary.push(`${regressor}: ${transformNames}`);
      }
    }
  });

  return { transformedData, transformationsSummary };
};

/**
 * Get transformation information
 */
export const getTransformationInfo = (type: string) => {
  const info: Record<string, any> = {
    log: {
      name: "Log Transform",
      description: "Applies natural logarithm to the data",
      useCase: "Use when variance increases with the level of the series (heteroskedasticity). Common for exponential growth patterns.",
      example: "Sales data that doubles each period, stock prices, population growth"
    },
    difference: {
      name: "First Difference",
      description: "Subtracts previous value from current value",
      useCase: "Removes linear trends and achieves stationarity. Most common transformation for non-stationary data.",
      example: "GDP data with upward trend, temperature data with seasonal trend"
    },
    seasonal_difference: {
      name: "Seasonal Difference",
      description: "Subtracts value from same season in previous cycle",
      useCase: "Removes seasonal patterns. Use when data shows repeating patterns (e.g., monthly, quarterly).",
      example: "Retail sales with monthly patterns, energy consumption with weekly cycles"
    },
    box_cox: {
      name: "Box-Cox Transform",
      description: "Power transformation that automatically finds optimal lambda",
      useCase: "Stabilizes variance and makes data more normal. More flexible than log transform.",
      example: "Any data with non-constant variance that needs normalization"
    },
    standardize: {
      name: "Standardize (Z-Score)",
      description: "Transforms data to have mean=0 and standard deviation=1 using (x - mean) / std",
      useCase: "Makes variables comparable when they have different scales or units. Essential for comparing multiple time series.",
      example: "Comparing sales ($) with temperature (°C), or variables with very different magnitudes"
    }
  };
  return info[type] || null;
};
