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

    // Prepare data summary for AI analysis
    const dataDescription = variables.map((v: any) => {
      const values = sampleData.map((row: any) => parseFloat(row[v.name]) || 0);
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const variance = values.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      return {
        name: v.name,
        type: v.type,
        mean: mean.toFixed(2),
        std: std.toFixed(2),
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        sampleValues: values.slice(0, 20).map((v: number) => v.toFixed(2))
      };
    });

    const systemPrompt = `You are a time series analysis expert. Analyze the provided variables and suggest appropriate transformations to achieve stationarity.

Available transformations:
1. standardize - Z-score normalization (x - mean) / std
2. log - Natural logarithm (for positive data with exponential growth)
3. difference - First difference (removes linear trends)
4. seasonal_difference - Seasonal differencing (removes seasonal patterns)
5. box_cox - Power transformation (flexible variance stabilization)

For each variable, suggest 1-3 transformations to apply in sequence. Consider:
- Data characteristics (trend, seasonality, variance patterns)
- The goal of achieving stationarity
- Whether it's a dependent variable or regressor

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "analyses": [
    {
      "variable": "variable_name",
      "type": "dependent" or "regressor",
      "recommendations": [
        {
          "transform": "transform_type",
          "reason": "brief reason why this helps",
          "order": 1
        }
      ],
      "rationale": "overall analysis summary",
      "confidence": "high" or "medium" or "low"
    }
  ]
}`;

    const userPrompt = `Analyze these time series variables and suggest transformations:

${JSON.stringify(dataDescription, null, 2)}

Return transformation recommendations for each variable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
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
