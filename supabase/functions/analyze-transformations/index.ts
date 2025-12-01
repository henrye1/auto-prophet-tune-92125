import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { variables, sampleData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare data summary for AI analysis with stationarity indicators
    const dataDescription = variables.map((v: any) => {
      const values = sampleData.map((row: any) => parseFloat(row[v.name]) || 0).filter((v: number) => !isNaN(v));
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const variance = values.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      // Calculate trend indicator
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const meanFirst = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
      const meanSecond = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;
      const trendIndicator = ((meanSecond - meanFirst) / meanFirst * 100).toFixed(2);
      
      // Check for exponential growth pattern
      const hasExponentialGrowth = values.every((v: number) => v > 0) && 
        values.slice(1).some((v: number, i: number) => (v / values[i] - 1) > 0.1);
      
      // Check variance stability
      const varFirst = firstHalf.reduce((a: number, b: number) => a + Math.pow(b - meanFirst, 2), 0) / firstHalf.length;
      const varSecond = secondHalf.reduce((a: number, b: number) => a + Math.pow(b - meanSecond, 2), 0) / secondHalf.length;
      const varianceChange = ((varSecond - varFirst) / varFirst * 100).toFixed(2);
      
      return {
        name: v.name,
        type: v.type,
        mean: mean.toFixed(2),
        std: std.toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        trendIndicator: trendIndicator,
        varianceChange: varianceChange,
        hasExponentialGrowth: hasExponentialGrowth,
        coefficientOfVariation: (std / mean).toFixed(4),
        sampleValues: values.slice(0, 20).map((v: number) => v.toFixed(2))
      };
    });

    const systemPrompt = `You are a time series stationarity expert. Your PRIMARY GOAL is to recommend transformations that WILL achieve stationarity (p-value < 0.05 in ADF test).

CRITICAL STATIONARITY INDICATORS PROVIDED:
- trendIndicator: % change in mean between first and second half (high values = strong trend)
- varianceChange: % change in variance between halves (high values = non-stationary variance)
- hasExponentialGrowth: boolean indicating exponential growth pattern
- coefficientOfVariation: std/mean ratio (high values = high relative variance)

TRANSFORMATION STRATEGY FOR STATIONARITY:

1. log - Apply FIRST if:
   - hasExponentialGrowth = true OR
   - coefficientOfVariation > 0.5 OR
   - varianceChange > 50%
   - Reason: Stabilizes exponential growth and variance

2. difference - Apply if:
   - trendIndicator > 10% (strong upward/downward trend) OR
   - After log transformation for trended data
   - Reason: Removes linear and polynomial trends

3. seasonal_difference - Apply if:
   - Data shows regular cyclical patterns OR
   - After log + difference for seasonal trends
   - Parameters: seasonal_period (e.g., 12 for monthly, 7 for daily)
   - Reason: Removes seasonal components

4. standardize - Apply LAST to:
   - Scale the final stationary series to mean=0, std=1
   - Makes it easier to compare variables
   - Reason: Normalizes scale without affecting stationarity

COMMON TRANSFORMATION SEQUENCES:
- Exponential growth with trend: [log, difference, standardize]
- Strong trend only: [difference, standardize]
- Seasonal data: [log, difference, seasonal_difference, standardize]
- High variance: [log, standardize]
- Already near-stationary: [standardize]

RULES:
1. ALWAYS recommend at least 2 transformations for data with trendIndicator > 5%
2. Log should come BEFORE difference when both are needed
3. Seasonal_difference should come AFTER regular difference
4. Standardize should ALWAYS be last if included
5. Be AGGRESSIVE - aim for p-value < 0.05

Available forecasting models:
- prophet: Best for strong seasonality, holidays, multiple seasonalities
- autogluon: Best for complex patterns, automatic feature engineering
- arima: Best for stationary series with clear autocorrelation structure
- ar: Best for short-term autoregressive dependencies
- arma: Best for stationary series with both AR and MA components

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "analyses": [
    {
      "variable": "variable_name",
      "type": "dependent" or "regressor",
      "recommendations": [
        {
          "transform": "transform_type",
          "reason": "specific reason based on the stationarity indicators",
          "order": 1
        }
      ],
      "rationale": "explain how these transformations address non-stationarity",
      "confidence": "high" or "medium" or "low",
      "recommended_model": "prophet" or "autogluon" or "arima" or "ar" or "arma",
      "model_rationale": "why this model is best for this data"
    }
  ]
}`;

    const userPrompt = `Analyze these time series variables with their stationarity indicators and recommend aggressive transformations to achieve stationarity (ADF p-value < 0.05):

${JSON.stringify(dataDescription, null, 2)}

Based on the stationarity indicators (trendIndicator, varianceChange, hasExponentialGrowth, coefficientOfVariation), recommend transformation sequences that will make each variable stationary. Be aggressive in your recommendations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    
    // Clean up response - remove markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const recommendations = JSON.parse(aiResponse);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-transformations:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
