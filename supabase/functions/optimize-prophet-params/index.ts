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
    const { segmentData, dateColumn, valueColumn, currentParams, frequency } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Determine appropriate seasonality based on data frequency
    const freq = frequency?.toLowerCase() || 'unknown';
    const isDaily = ['d', 'daily', 'day'].some(f => freq.includes(f));
    const isWeekly = ['w', 'weekly', 'week'].some(f => freq.includes(f));
    const isMonthly = ['m', 'monthly', 'month', 'ms', 'me'].some(f => freq.includes(f));
    const isQuarterly = ['q', 'quarterly', 'quarter'].some(f => freq.includes(f));
    const isYearly = ['y', 'yearly', 'year', 'a', 'annual'].some(f => freq.includes(f));

    // Determine which seasonalities make sense for this frequency
    let appropriateSeasonalities = {
      yearly: false,
      weekly: false,
      daily: false,
    };

    if (isDaily) {
      appropriateSeasonalities = {
        yearly: segmentData.length >= 365 * 2,
        weekly: segmentData.length >= 14,
        daily: false, // Daily data doesn't have sub-daily patterns
      };
    } else if (isWeekly) {
      appropriateSeasonalities = {
        yearly: segmentData.length >= 52 * 2,
        weekly: false, // Weekly data doesn't have sub-weekly patterns
        daily: false,
      };
    } else if (isMonthly) {
      appropriateSeasonalities = {
        yearly: segmentData.length >= 24, // At least 2 years
        weekly: false, // Monthly data cannot capture weekly patterns
        daily: false,  // Monthly data cannot capture daily patterns
      };
    } else if (isQuarterly) {
      appropriateSeasonalities = {
        yearly: segmentData.length >= 8, // At least 2 years
        weekly: false,
        daily: false,
      };
    } else if (isYearly) {
      appropriateSeasonalities = {
        yearly: false, // Yearly data doesn't have sub-yearly patterns
        weekly: false,
        daily: false,
      };
    } else {
      // Unknown frequency - be conservative
      appropriateSeasonalities = {
        yearly: segmentData.length >= 730,
        weekly: segmentData.length >= 14,
        daily: segmentData.length >= 3,
      };
    }

    const systemPrompt = `You are a time series forecasting expert specializing in Prophet model optimization.
Analyze the provided data characteristics and current parameters, then suggest optimal Prophet hyperparameters.

Data characteristics:
- Total records: ${segmentData.length}
- Data frequency: ${frequency || 'unknown'}
- Date column: ${dateColumn}
- Value column: ${valueColumn}

IMPORTANT SEASONALITY CONSTRAINTS based on data frequency:
- Yearly seasonality should be: ${appropriateSeasonalities.yearly ? 'ENABLED (true or integer Fourier terms)' : 'DISABLED (false) - not enough data or frequency too coarse'}
- Weekly seasonality should be: ${appropriateSeasonalities.weekly ? 'ENABLED (true or integer Fourier terms)' : 'DISABLED (false) - data frequency is too coarse to capture weekly patterns'}
- Daily seasonality should be: ${appropriateSeasonalities.daily ? 'ENABLED (true or integer Fourier terms)' : 'DISABLED (false) - data frequency is too coarse to capture daily patterns'}

CRITICAL: You MUST set seasonality to false when the data frequency is too coarse. For example:
- Monthly data CANNOT have weekly or daily seasonality (will cause overfitting)
- Quarterly data CANNOT have monthly, weekly, or daily seasonality
- Weekly data CANNOT have daily seasonality

Provide optimized parameters with explanations for each setting. Focus on:
1. Growth model selection (linear vs logistic)
2. Changepoint sensitivity
3. Seasonality settings (respecting frequency constraints above)
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
        temperature: 0.3,
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
