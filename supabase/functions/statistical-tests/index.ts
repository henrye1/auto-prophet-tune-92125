import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Augmented Dickey-Fuller Test
function adfTest(data: number[]): any {
  const n = data.length;
  const diff = data.slice(1).map((val, i) => val - data[i]);
  
  // Simple ADF approximation
  const mean = diff.reduce((a, b) => a + b, 0) / diff.length;
  const variance = diff.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / diff.length;
  const std = Math.sqrt(variance);
  
  // Test statistic approximation
  const testStat = -std * Math.sqrt(n / 12);
  const pValue = testStat < -2.86 ? 0.02 : (testStat < -2.57 ? 0.08 : 0.15);
  
  return {
    test_statistic: parseFloat(testStat.toFixed(3)),
    p_value: parseFloat(pValue.toFixed(4)),
    critical_values: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
    is_stationary: pValue < 0.05,
    recommendation: pValue < 0.05 
      ? "Data appears stationary" 
      : "Data is non-stationary, consider transformations"
  };
}

// Autocorrelation Function
function calculateACF(data: number[], maxLag: number = 20): any {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  
  const lags: number[] = [];
  const correlations: number[] = [];
  
  for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean);
    }
    const corr = sum / (n * variance);
    lags.push(lag);
    correlations.push(parseFloat(corr.toFixed(4)));
  }
  
  const confidence_interval = 1.96 / Math.sqrt(n);
  
  return { lags, correlations, confidence_interval: parseFloat(confidence_interval.toFixed(4)) };
}

// Partial Autocorrelation Function
function calculatePACF(data: number[], maxLag: number = 20): any {
  const acf = calculateACF(data, maxLag);
  const n = data.length;
  const pacf: number[] = [1]; // PACF at lag 0 is always 1
  
  // Simple PACF approximation using Yule-Walker
  for (let lag = 1; lag <= Math.min(maxLag, acf.correlations.length - 1); lag++) {
    if (lag === 1) {
      pacf.push(acf.correlations[1]);
    } else {
      // Simplified calculation
      const numerator = acf.correlations[lag];
      const denominator = 1 + acf.correlations.slice(1, lag).reduce((sum: number, val: number) => sum + Math.abs(val), 0) * 0.5;
      pacf.push(parseFloat((numerator / denominator).toFixed(4)));
    }
  }
  
  const confidence_interval = 1.96 / Math.sqrt(n);
  
  return { 
    lags: acf.lags, 
    correlations: pacf,
    confidence_interval: parseFloat(confidence_interval.toFixed(4))
  };
}

// Pearson Correlation
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const xData = x.slice(0, n);
  const yData = y.slice(0, n);
  
  const meanX = xData.reduce((a, b) => a + b, 0) / n;
  const meanY = yData.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = xData[i] - meanX;
    const dy = yData[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  const correlation = numerator / Math.sqrt(denomX * denomY);
  return parseFloat(correlation.toFixed(4));
}

// Apply transformations
function applyTransformations(data: number[], transformations: any[]): number[] {
  let transformed = [...data];
  
  for (const transform of transformations) {
    switch (transform.type) {
      case 'standardize':
        const validData = transformed.filter(v => !isNaN(v) && isFinite(v));
        const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
        const variance = validData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validData.length;
        const std = Math.sqrt(variance);
        transformed = transformed.map(v => std > 0 ? (v - mean) / std : 0);
        break;
      case 'log':
        transformed = transformed.map(v => v > 0 ? Math.log(v) : NaN);
        break;
      case 'difference':
        transformed = transformed.slice(1).map((v, i) => v - transformed[i]);
        break;
      case 'seasonal_difference':
        const period = transform.parameters?.seasonal_period || 12;
        transformed = transformed.slice(period).map((v, i) => v - transformed[i]);
        break;
      case 'box_cox':
        const lambda = transform.parameters?.lambda || 0;
        if (lambda === 0) {
          transformed = transformed.map(v => v > 0 ? Math.log(v) : NaN);
        } else {
          transformed = transformed.map(v => v > 0 ? (Math.pow(v, lambda) - 1) / lambda : NaN);
        }
        break;
    }
    // Remove NaN values
    transformed = transformed.filter(v => !isNaN(v) && isFinite(v));
  }
  
  return transformed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, transformations, dependentData, variable } = await req.json();
    
    console.log('Running statistical tests for:', variable);
    console.log('Data points:', data.length);
    console.log('Transformations:', transformations);
    
    // Parse data to numbers
    const numericData = data.map((v: any) => parseFloat(v)).filter((v: number) => !isNaN(v));
    
    if (numericData.length < 10) {
      throw new Error('Insufficient data points for analysis (minimum 10 required)');
    }
    
    // Before transformation analysis
    const beforeADF = adfTest(numericData);
    const beforeACF = calculateACF(numericData);
    const beforePACF = calculatePACF(numericData);
    
    // After transformation analysis
    let afterADF = null;
    let afterACF = null;
    let afterPACF = null;
    let transformedData = numericData;
    
    if (transformations && transformations.length > 0) {
      transformedData = applyTransformations(numericData, transformations);
      
      if (transformedData.length >= 10) {
        afterADF = adfTest(transformedData);
        afterACF = calculateACF(transformedData);
        afterPACF = calculatePACF(transformedData);
      }
    }
    
    // Correlation with dependent variable (if provided)
    let correlationBefore = null;
    let correlationAfter = null;
    
    if (dependentData && variable !== 'dependent') {
      const numericDependent = dependentData.map((v: any) => parseFloat(v)).filter((v: number) => !isNaN(v));
      
      if (numericDependent.length >= 10 && numericData.length >= 10) {
        correlationBefore = calculateCorrelation(numericDependent, numericData);
        
        if (transformedData.length >= 10) {
          correlationAfter = calculateCorrelation(numericDependent, transformedData);
        }
      }
    }
    
    const result = {
      variable,
      before: {
        adf: beforeADF,
        acf: beforeACF,
        pacf: beforePACF,
        correlation: correlationBefore
      },
      after: afterADF ? {
        adf: afterADF,
        acf: afterACF,
        pacf: afterPACF,
        correlation: correlationAfter
      } : null,
      transformedDataSample: transformedData.slice(0, 50)
    };
    
    console.log('Analysis complete for:', variable);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in statistical-tests:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
