import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Sparkles, Info, Loader2 } from "lucide-react";
import { SeasonalityConfig } from "./SeasonalityConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { ProphetParameters, SegmentConfig } from "@/types/forecast";

interface ProphetHyperparametersProps {
  segment: SegmentConfig;
  onParametersChange: (parameters: ProphetParameters) => void;
  csvData: any[];
  dateColumn: string;
  valueColumn: string;
}

interface ParamExplanation {
  value: any;
  explanation: string;
  why_relevant: string;
}

export const ProphetHyperparameters = ({ 
  segment, 
  onParametersChange,
  csvData,
  dateColumn,
  valueColumn 
}: ProphetHyperparametersProps) => {
  const parameters = segment.prophet_params || {
    growth: 'linear',
    changepoint_prior_scale: 0.05,
    seasonality_mode: 'additive',
    seasonality_prior_scale: 10,
    yearly_seasonality: true,
    weekly_seasonality: false,
    daily_seasonality: false,
    changepoint_range: 0.8,
    cv_initial: 730,
    cv_period: 180,
    cv_horizon: 365,
    custom_seasonalities: [],
    interval_width: 0.80,
    lower_bound: undefined,
    upper_bound: undefined,
  };

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [paramExplanations, setParamExplanations] = useState<Record<string, ParamExplanation>>({});

  const updateParameter = (key: keyof ProphetParameters, value: any) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    toast.info("AI is analyzing your data and optimizing hyperparameters...");

    try {
      const { data, error } = await supabase.functions.invoke('optimize-prophet-params', {
        body: {
          segmentData: csvData,
          dateColumn,
          valueColumn,
          currentParams: parameters
        }
      });

      if (error) throw error;

      const { optimizedParams } = data;

      // Build new parameters object
      const newParams: ProphetParameters = {
        growth: optimizedParams.growth.value,
        changepoint_prior_scale: optimizedParams.changepoint_prior_scale.value,
        seasonality_mode: optimizedParams.seasonality_mode.value,
        seasonality_prior_scale: optimizedParams.seasonality_prior_scale.value,
        yearly_seasonality: optimizedParams.yearly_seasonality.value,
        weekly_seasonality: optimizedParams.weekly_seasonality.value,
        daily_seasonality: optimizedParams.daily_seasonality.value,
        changepoint_range: optimizedParams.changepoint_range.value,
        interval_width: optimizedParams.interval_width.value,
        cv_initial: parameters.cv_initial,
        cv_period: parameters.cv_period,
        cv_horizon: parameters.cv_horizon,
        custom_seasonalities: parameters.custom_seasonalities,
        lower_bound: parameters.lower_bound,
        upper_bound: parameters.upper_bound,
      };

      // Store explanations
      const explanations: Record<string, ParamExplanation> = {};
      Object.keys(optimizedParams).forEach(key => {
        explanations[key] = optimizedParams[key];
      });
      setParamExplanations(explanations);

      onParametersChange(newParams);
      toast.success("Hyperparameters optimized successfully!");
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to optimize hyperparameters");
    } finally {
      setIsOptimizing(false);
    }
  };

  const renderExplanation = (paramKey: string) => {
    const explanation = paramExplanations[paramKey];
    if (!explanation) return null;

    return (
      <Alert className="mt-2 bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <p className="font-medium mb-1">{explanation.explanation}</p>
          <p className="text-muted-foreground text-xs">{explanation.why_relevant}</p>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Prophet Hyperparameters - {segment.segment}
            </CardTitle>
            <CardDescription>
              Configure model parameters for optimal forecasting with AI-powered explanations
            </CardDescription>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Optimize
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="seasonality">Seasonality</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="growth">Growth Model</Label>
                <Select value={parameters.growth} onValueChange={(v) => updateParameter('growth', v)}>
                  <SelectTrigger id="growth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="logistic">Logistic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Linear for unbounded growth, logistic for saturating forecasts
                </p>
                {renderExplanation('growth')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seasonality-mode">Seasonality Mode</Label>
                <Select value={parameters.seasonality_mode} onValueChange={(v) => updateParameter('seasonality_mode', v)}>
                  <SelectTrigger id="seasonality-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="additive">Additive</SelectItem>
                    <SelectItem value="multiplicative">Multiplicative</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Additive for constant seasonality, multiplicative when seasonality scales with trend
                </p>
                {renderExplanation('seasonality_mode')}
              </div>

              <div className="space-y-3">
                <Label htmlFor="changepoint-prior">
                  Changepoint Prior Scale: {parameters.changepoint_prior_scale.toFixed(3)}
                </Label>
                <Slider
                  id="changepoint-prior"
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  value={[parameters.changepoint_prior_scale]}
                  onValueChange={([v]) => updateParameter('changepoint_prior_scale', v)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = more flexible trend, lower = smoother
                </p>
                {renderExplanation('changepoint_prior_scale')}
              </div>

              <div className="space-y-3">
                <Label htmlFor="seasonality-prior">
                  Seasonality Prior Scale: {parameters.seasonality_prior_scale.toFixed(1)}
                </Label>
                <Slider
                  id="seasonality-prior"
                  min={0.01}
                  max={20}
                  step={0.1}
                  value={[parameters.seasonality_prior_scale]}
                  onValueChange={([v]) => updateParameter('seasonality_prior_scale', v)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Controls strength of seasonal component
                </p>
                {renderExplanation('seasonality_prior_scale')}
              </div>

              <div className="space-y-3">
                <Label htmlFor="changepoint-range">
                  Changepoint Range: {parameters.changepoint_range.toFixed(2)}
                </Label>
                <Slider
                  id="changepoint-range"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={[parameters.changepoint_range]}
                  onValueChange={([v]) => updateParameter('changepoint_range', v)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Proportion of history for potential changepoints
                </p>
                {renderExplanation('changepoint_range')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seasonality" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="yearly">Yearly Seasonality</Label>
                  <Switch
                    id="yearly"
                    checked={parameters.yearly_seasonality !== false}
                    onCheckedChange={(checked) => updateParameter('yearly_seasonality', checked ? true : false)}
                  />
                </div>
                {typeof parameters.yearly_seasonality === 'number' && (
                  <div className="space-y-2">
                    <Label htmlFor="yearly-order">Fourier Order</Label>
                    <Input
                      id="yearly-order"
                      type="number"
                      min={1}
                      max={20}
                      value={parameters.yearly_seasonality}
                      onChange={(e) => updateParameter('yearly_seasonality', parseInt(e.target.value))}
                    />
                  </div>
                )}
                {renderExplanation('yearly_seasonality')}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekly">Weekly Seasonality</Label>
                  <Switch
                    id="weekly"
                    checked={parameters.weekly_seasonality !== false}
                    onCheckedChange={(checked) => updateParameter('weekly_seasonality', checked ? true : false)}
                  />
                </div>
                {typeof parameters.weekly_seasonality === 'number' && (
                  <div className="space-y-2">
                    <Label htmlFor="weekly-order">Fourier Order</Label>
                    <Input
                      id="weekly-order"
                      type="number"
                      min={1}
                      max={10}
                      value={parameters.weekly_seasonality}
                      onChange={(e) => updateParameter('weekly_seasonality', parseInt(e.target.value))}
                    />
                  </div>
                )}
                {renderExplanation('weekly_seasonality')}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily">Daily Seasonality</Label>
                  <Switch
                    id="daily"
                    checked={parameters.daily_seasonality !== false}
                    onCheckedChange={(checked) => updateParameter('daily_seasonality', checked ? true : false)}
                  />
                </div>
                {typeof parameters.daily_seasonality === 'number' && (
                  <div className="space-y-2">
                    <Label htmlFor="daily-order">Fourier Order</Label>
                    <Input
                      id="daily-order"
                      type="number"
                      min={1}
                      max={10}
                      value={parameters.daily_seasonality}
                      onChange={(e) => updateParameter('daily_seasonality', parseInt(e.target.value))}
                    />
                  </div>
                )}
                {renderExplanation('daily_seasonality')}
              </div>
            </div>

            <SeasonalityConfig
              customSeasonalities={parameters.custom_seasonalities || []}
              onCustomSeasonalitiesChange={(seasonalities) => updateParameter('custom_seasonalities', seasonalities)}
            />
          </TabsContent>

          <TabsContent value="validation" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cv-initial">Initial Training Period (days)</Label>
                <Input
                  id="cv-initial"
                  type="number"
                  min={365}
                  value={parameters.cv_initial}
                  onChange={(e) => updateParameter('cv_initial', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum data for first training window
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-period">Period Between Cutoffs (days)</Label>
                <Input
                  id="cv-period"
                  type="number"
                  min={30}
                  value={parameters.cv_period}
                  onChange={(e) => updateParameter('cv_period', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Spacing between cross-validation windows
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-horizon">Forecast Horizon (days)</Label>
                <Input
                  id="cv-horizon"
                  type="number"
                  min={30}
                  value={parameters.cv_horizon}
                  onChange={(e) => updateParameter('cv_horizon', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  How far ahead to validate predictions
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="confidence" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="interval-width">
                  Confidence Interval Width: {(parameters.interval_width * 100).toFixed(0)}%
                </Label>
                <Slider
                  id="interval-width"
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  value={[parameters.interval_width]}
                  onValueChange={([v]) => updateParameter('interval_width', v)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Width of uncertainty intervals (e.g., 0.80 = 80% confidence)
                </p>
                {renderExplanation('interval_width')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lower-bound">Custom Lower Percentile (1-49)</Label>
                  <Input
                    id="lower-bound"
                    type="number"
                    min={1}
                    max={49}
                    step={1}
                    placeholder="e.g., 5 for 5th percentile"
                    value={parameters.lower_bound ? Math.round(parameters.lower_bound * 100) : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) / 100 : undefined;
                      updateParameter('lower_bound', value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Enter as whole number (e.g., 5 = 5th percentile)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upper-bound">Custom Upper Percentile (51-99)</Label>
                  <Input
                    id="upper-bound"
                    type="number"
                    min={51}
                    max={99}
                    step={1}
                    placeholder="e.g., 95 for 95th percentile"
                    value={parameters.upper_bound ? Math.round(parameters.upper_bound * 100) : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) / 100 : undefined;
                      updateParameter('upper_bound', value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Enter as whole number (e.g., 95 = 95th percentile)
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
