import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { SeasonalityConfig } from "./SeasonalityConfig";
import type { ProphetParameters } from "@/types/forecast";

interface ProphetHyperparametersProps {
  parameters: ProphetParameters;
  onParametersChange: (parameters: ProphetParameters) => void;
}

export const ProphetHyperparameters = ({ parameters, onParametersChange }: ProphetHyperparametersProps) => {
  const updateParameter = (key: keyof ProphetParameters, value: any) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Prophet Hyperparameters
        </CardTitle>
        <CardDescription>Configure model parameters for optimal forecasting</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="seasonality">Seasonality</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="changepoint-prior">
                  Changepoint Prior Scale: {parameters.changepoint_prior_scale.toFixed(3)}
                </Label>
                <Slider
                  id="changepoint-prior"
                  min={0.001}
                  max={1}
                  step={0.001}
                  value={[parameters.changepoint_prior_scale]}
                  onValueChange={([v]) => updateParameter('changepoint_prior_scale', v)}
                  className="py-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seasonality-prior">
                  Seasonality Prior Scale: {parameters.seasonality_prior_scale.toFixed(2)}
                </Label>
                <Slider
                  id="seasonality-prior"
                  min={0.01}
                  max={10}
                  step={0.01}
                  value={[parameters.seasonality_prior_scale]}
                  onValueChange={([v]) => updateParameter('seasonality_prior_scale', v)}
                  className="py-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="changepoint-range">
                  Changepoint Range: {parameters.changepoint_range.toFixed(2)}
                </Label>
                <Slider
                  id="changepoint-range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[parameters.changepoint_range]}
                  onValueChange={([v]) => updateParameter('changepoint_range', v)}
                  className="py-2"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seasonality" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="yearly-seasonality">Yearly Seasonality</Label>
                    <Switch
                      id="yearly-seasonality"
                      checked={typeof parameters.yearly_seasonality === 'boolean' ? parameters.yearly_seasonality : true}
                      onCheckedChange={(checked) => updateParameter('yearly_seasonality', checked)}
                    />
                  </div>
                  {typeof parameters.yearly_seasonality === 'number' && (
                    <Input
                      type="number"
                      value={parameters.yearly_seasonality}
                      onChange={(e) => updateParameter('yearly_seasonality', parseInt(e.target.value) || 10)}
                      placeholder="Fourier order"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekly-seasonality">Weekly Seasonality</Label>
                    <Switch
                      id="weekly-seasonality"
                      checked={typeof parameters.weekly_seasonality === 'boolean' ? parameters.weekly_seasonality : true}
                      onCheckedChange={(checked) => updateParameter('weekly_seasonality', checked)}
                    />
                  </div>
                  {typeof parameters.weekly_seasonality === 'number' && (
                    <Input
                      type="number"
                      value={parameters.weekly_seasonality}
                      onChange={(e) => updateParameter('weekly_seasonality', parseInt(e.target.value) || 3)}
                      placeholder="Fourier order"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="daily-seasonality">Daily Seasonality</Label>
                    <Switch
                      id="daily-seasonality"
                      checked={typeof parameters.daily_seasonality === 'boolean' ? parameters.daily_seasonality : false}
                      onCheckedChange={(checked) => updateParameter('daily_seasonality', checked)}
                    />
                  </div>
                  {typeof parameters.daily_seasonality === 'number' && (
                    <Input
                      type="number"
                      value={parameters.daily_seasonality}
                      onChange={(e) => updateParameter('daily_seasonality', parseInt(e.target.value) || 4)}
                      placeholder="Fourier order"
                    />
                  )}
                </div>
              </div>

              <SeasonalityConfig
                customSeasonalities={parameters.custom_seasonalities || []}
                onCustomSeasonalitiesChange={(seasonalities) =>
                  updateParameter('custom_seasonalities', seasonalities)
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-6 mt-6">
            <div>
              <h4 className="text-sm font-semibold mb-4">Cross-Validation Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cv-initial">Initial (days)</Label>
                  <Input
                    id="cv-initial"
                    type="number"
                    value={parameters.cv_initial}
                    onChange={(e) => updateParameter('cv_initial', parseInt(e.target.value) || 730)}
                  />
                  <p className="text-xs text-muted-foreground">Size of initial training period</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv-period">Period (days)</Label>
                  <Input
                    id="cv-period"
                    type="number"
                    value={parameters.cv_period}
                    onChange={(e) => updateParameter('cv_period', parseInt(e.target.value) || 180)}
                  />
                  <p className="text-xs text-muted-foreground">Spacing between cutoff dates</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv-horizon">Horizon (days)</Label>
                  <Input
                    id="cv-horizon"
                    type="number"
                    value={parameters.cv_horizon}
                    onChange={(e) => updateParameter('cv_horizon', parseInt(e.target.value) || 365)}
                  />
                  <p className="text-xs text-muted-foreground">Forecast horizon to evaluate</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
