import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, Settings2, AlertCircle } from "lucide-react";
import type { Regressor } from "@/types/forecast";

interface RegressorConfigProps {
  availableRegressors: string[];
  selectedRegressors: Regressor[];
  onRegressorsChange: (regressors: Regressor[]) => void;
  nonNumericCount?: number;
}

export const RegressorConfig = ({
  availableRegressors,
  selectedRegressors,
  onRegressorsChange,
  nonNumericCount = 0,
}: RegressorConfigProps) => {
  const [newRegressor, setNewRegressor] = useState("");

  const addRegressor = () => {
    if (newRegressor && !selectedRegressors.find((r) => r.name === newRegressor)) {
      onRegressorsChange([
        ...selectedRegressors,
        {
          name: newRegressor,
          prior_scale: 10,
          standardize: true,
          mode: 'additive',
          lead_lag: 0,
        },
      ]);
      setNewRegressor("");
    }
  };

  const removeRegressor = (name: string) => {
    onRegressorsChange(selectedRegressors.filter((r) => r.name !== name));
  };

  const updateRegressor = (name: string, updates: Partial<Regressor>) => {
    onRegressorsChange(
      selectedRegressors.map((r) => (r.name === name ? { ...r, ...updates } : r))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Regressor Configuration
        </CardTitle>
        <CardDescription>Select and configure drivers for your forecast</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {nonNumericCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {nonNumericCount} non-numeric column{nonNumericCount > 1 ? 's' : ''} hidden. Only numeric variables can be used for statistical analysis.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Select value={newRegressor} onValueChange={setNewRegressor}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select regressor to add" />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-60">
              {availableRegressors
                .filter((r) => !selectedRegressors.find((sr) => sr.name === r))
                .map((regressor) => (
                  <SelectItem key={regressor} value={regressor}>
                    {regressor}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={addRegressor} disabled={!newRegressor}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {selectedRegressors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No regressors selected. Add regressors to enhance your forecast.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedRegressors.map((regressor) => (
              <Card key={regressor.name} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-sm">
                      {regressor.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRegressor(regressor.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Prior Scale</Label>
                      <Input
                        type="number"
                        value={regressor.prior_scale}
                        onChange={(e) =>
                          updateRegressor(regressor.name, {
                            prior_scale: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <Select
                        value={regressor.mode}
                        onValueChange={(v) => updateRegressor(regressor.name, { mode: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="additive">Additive</SelectItem>
                          <SelectItem value="multiplicative">Multiplicative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Lead/Lag</Label>
                      <Input
                        type="number"
                        value={regressor.lead_lag}
                        onChange={(e) =>
                          updateRegressor(regressor.name, {
                            lead_lag: parseInt(e.target.value),
                          })
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={regressor.standardize === true}
                          onCheckedChange={(checked) =>
                            updateRegressor(regressor.name, { standardize: checked })
                          }
                        />
                        <Label>Standardize</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
