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
    const { segmentData, dateColumn, valueColumn, currentParams } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Analyze data patterns
    const dataAnalysis = {
      recordCount: segmentData.length,
      hasYearlySeason: segmentData.length >= 730,
      hasWeeklySeason: segmentData.length >= 14,
      hasDailySeason: segmentData.length >= 3,
    };

    const systemPrompt = `You are a time series forecasting expert specializing in Prophet model optimization.
Analyze the provided data characteristics and current parameters, then suggest optimal Prophet hyperparameters.

Data characteristics:
- Total records: ${dataAnalysis.recordCount}
- Date column: ${dateColumn}
- Value column: ${valueColumn}
- Has yearly seasonality data: ${dataAnalysis.hasYearlySeason}
- Has weekly seasonality data: ${dataAnalysis.hasWeeklySeason}
- Has daily seasonality data: ${dataAnalysis.hasDailySeason}

Provide optimized parameters with explanations for each setting. Focus on:
1. Growth model selection (linear vs logistic)
2. Changepoint sensitivity
3. Seasonality settings
4. Cross-validation parameters
5. Confidence intervals

Return a structured response explaining each parameter optimization.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Current parameters: ${JSON.stringify(currentParams, null, 2)}
            
Please analyze and suggest optimizations.` 
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "optimize_prophet_parameters",
            description: "Return optimized Prophet hyperparameters with explanations",
            parameters: {
              type: "object",
              properties: {
                growth: {
                  type: "object",
                  properties: {
                    value: { type: "string", enum: ["linear", "logistic"] },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                changepoint_prior_scale: {
                  type: "object",
                  properties: {
                    value: { type: "number" },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                seasonality_mode: {
                  type: "object",
                  properties: {
                    value: { type: "string", enum: ["additive", "multiplicative"] },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                seasonality_prior_scale: {
                  type: "object",
                  properties: {
                    value: { type: "number" },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                yearly_seasonality: {
                  type: "object",
                  properties: {
                    value: { type: ["boolean", "number"] },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                weekly_seasonality: {
                  type: "object",
                  properties: {
                    value: { type: ["boolean", "number"] },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                daily_seasonality: {
                  type: "object",
                  properties: {
                    value: { type: ["boolean", "number"] },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                changepoint_range: {
                  type: "object",
                  properties: {
                    value: { type: "number" },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                },
                interval_width: {
                  type: "object",
                  properties: {
                    value: { type: "number" },
                    explanation: { type: "string" },
                    why_relevant: { type: "string" }
                  },
                  required: ["value", "explanation", "why_relevant"]
                }
              },
              required: [
                "growth", 
                "changepoint_prior_scale", 
                "seasonality_mode", 
                "seasonality_prior_scale",
                "yearly_seasonality",
                "weekly_seasonality",
                "daily_seasonality",
                "changepoint_range",
                "interval_width"
              ],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "optimize_prophet_parameters" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const optimizedParams = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ optimizedParams }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in optimize-prophet-params:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
