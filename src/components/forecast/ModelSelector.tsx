import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Brain, Zap } from "lucide-react";
import type { ForecastModel } from "@/types/forecast";

interface ModelSelectorProps {
  selectedModel: ForecastModel;
  onModelChange: (model: ForecastModel) => void;
}

export const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Forecasting Model</CardTitle>
        <CardDescription>Choose the time series model for your analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedModel} onValueChange={(value) => onModelChange(value as ForecastModel)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Label
              htmlFor="prophet"
              className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                selectedModel === 'prophet'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="prophet" id="prophet" className="sr-only" />
              <Brain className="h-12 w-12 mb-3 text-primary" />
              <span className="text-lg font-semibold mb-2">Facebook Prophet</span>
              <span className="text-sm text-muted-foreground text-center">
                Powerful additive model for time series with trends and seasonality
              </span>
            </Label>

            <Label
              htmlFor="autogluon"
              className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                selectedModel === 'autogluon'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <RadioGroupItem value="autogluon" id="autogluon" className="sr-only" />
              <Zap className="h-12 w-12 mb-3 text-accent" />
              <span className="text-lg font-semibold mb-2">AWS AutoGluon</span>
              <span className="text-sm text-muted-foreground text-center">
                AutoML ensemble approach with automatic model selection
              </span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
