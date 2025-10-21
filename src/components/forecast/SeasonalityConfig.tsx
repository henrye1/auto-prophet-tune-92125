import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Waves } from "lucide-react";
import type { CustomSeasonality } from "@/types/forecast";

interface SeasonalityConfigProps {
  customSeasonalities: CustomSeasonality[];
  onCustomSeasonalitiesChange: (seasonalities: CustomSeasonality[]) => void;
}

const PRESET_SEASONALITIES = [
  { name: 'hourly', period: 24, fourier_order: 8, description: '24 hours in a day' },
  { name: 'daily', period: 7, fourier_order: 3, description: '7 days in a week' },
  { name: 'weekly', period: 52, fourier_order: 5, description: '52 weeks in a year' },
  { name: 'monthly', period: 12, fourier_order: 5, description: '12 months in a year' },
  { name: 'quarterly', period: 4, fourier_order: 3, description: '4 quarters in a year' },
];

export const SeasonalityConfig = ({
  customSeasonalities,
  onCustomSeasonalitiesChange,
}: SeasonalityConfigProps) => {
  const [selectedPreset, setSelectedPreset] = useState("");

  const addPresetSeasonality = () => {
    const preset = PRESET_SEASONALITIES.find(p => p.name === selectedPreset);
    if (preset && !customSeasonalities.find(s => s.name === preset.name)) {
      onCustomSeasonalitiesChange([
        ...customSeasonalities,
        {
          name: preset.name,
          period: preset.period,
          fourier_order: preset.fourier_order,
          prior_scale: 10,
          mode: 'additive',
        },
      ]);
      setSelectedPreset("");
    }
  };

  const addCustomSeasonality = () => {
    const name = `custom_${customSeasonalities.length + 1}`;
    onCustomSeasonalitiesChange([
      ...customSeasonalities,
      {
        name,
        period: 7,
        fourier_order: 3,
        prior_scale: 10,
        mode: 'additive',
      },
    ]);
  };

  const removeSeasonality = (name: string) => {
    onCustomSeasonalitiesChange(customSeasonalities.filter(s => s.name !== name));
  };

  const updateSeasonality = (name: string, updates: Partial<CustomSeasonality>) => {
    onCustomSeasonalitiesChange(
      customSeasonalities.map(s => s.name === name ? { ...s, ...updates } : s)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          Custom Seasonalities
        </CardTitle>
        <CardDescription>
          Add custom seasonality patterns beyond built-in daily/weekly/yearly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Select value={selectedPreset} onValueChange={setSelectedPreset}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add preset seasonality" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {PRESET_SEASONALITIES.filter(p => !customSeasonalities.find(s => s.name === p.name)).map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name.charAt(0).toUpperCase() + preset.name.slice(1)} - {preset.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addPresetSeasonality} disabled={!selectedPreset}>
            <Plus className="h-4 w-4 mr-2" />
            Add Preset
          </Button>
          <Button variant="outline" onClick={addCustomSeasonality}>
            <Plus className="h-4 w-4 mr-2" />
            Custom
          </Button>
        </div>

        {customSeasonalities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No custom seasonalities configured. Prophet will use built-in seasonalities only.
          </div>
        ) : (
          <div className="space-y-4">
            {customSeasonalities.map((seasonality) => (
              <Card key={seasonality.name} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-sm">
                      {seasonality.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSeasonality(seasonality.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={seasonality.name}
                        onChange={(e) =>
                          updateSeasonality(seasonality.name, {
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Period</Label>
                      <Input
                        type="number"
                        value={seasonality.period}
                        onChange={(e) =>
                          updateSeasonality(seasonality.name, {
                            period: parseFloat(e.target.value) || 7,
                          })
                        }
                        step="0.1"
                      />
                      <p className="text-xs text-muted-foreground">Days or hours</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Fourier Order</Label>
                      <Input
                        type="number"
                        value={seasonality.fourier_order}
                        onChange={(e) =>
                          updateSeasonality(seasonality.name, {
                            fourier_order: parseInt(e.target.value) || 3,
                          })
                        }
                        min={1}
                      />
                      <p className="text-xs text-muted-foreground">Complexity (1-20)</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Prior Scale</Label>
                      <Input
                        type="number"
                        value={seasonality.prior_scale}
                        onChange={(e) =>
                          updateSeasonality(seasonality.name, {
                            prior_scale: parseFloat(e.target.value) || 10,
                          })
                        }
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Mode</Label>
                      <Select
                        value={seasonality.mode}
                        onValueChange={(v) =>
                          updateSeasonality(seasonality.name, {
                            mode: v as 'additive' | 'multiplicative',
                          })
                        }
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
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-semibold">Common Periods:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>Hourly:</strong> period=24 (24 hours in day)</li>
            <li><strong>Daily:</strong> period=7 (7 days in week)</li>
            <li><strong>Weekly:</strong> period=52 (52 weeks in year)</li>
            <li><strong>Monthly:</strong> period=12 (12 months in year)</li>
            <li><strong>Quarterly:</strong> period=4 (4 quarters in year)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
