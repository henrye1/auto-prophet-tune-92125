import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
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
      <CardContent className="space-y-6">
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

          <div className="space-y-2 flex items-center justify-between">
            <Label htmlFor="yearly-seasonality">Yearly Seasonality</Label>
            <Switch
              id="yearly-seasonality"
              checked={parameters.yearly_seasonality === true}
              onCheckedChange={(checked) => updateParameter('yearly_seasonality', checked)}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-4">Cross-Validation Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cv-initial">Initial (days)</Label>
              <Input
                id="cv-initial"
                type="number"
                value={parameters.cv_initial}
                onChange={(e) => updateParameter('cv_initial', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-period">Period (days)</Label>
              <Input
                id="cv-period"
                type="number"
                value={parameters.cv_period}
                onChange={(e) => updateParameter('cv_period', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-horizon">Horizon (days)</Label>
              <Input
                id="cv-horizon"
                type="number"
                value={parameters.cv_horizon}
                onChange={(e) => updateParameter('cv_horizon', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
