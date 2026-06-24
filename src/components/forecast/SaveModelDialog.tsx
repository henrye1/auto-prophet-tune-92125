import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ForecastConfig } from "@/types/forecast";

interface SaveModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ForecastConfig;
  existingModelId?: string;
  existingModelName?: string;
  csvData: any[];
  forecastResults: any;
  onSaved: (modelId: string, modelName: string) => void;
}

export function SaveModelDialog({
  open,
  onOpenChange,
  config,
  existingModelId,
  existingModelName,
  csvData,
  forecastResults,
  onSaved,
}: SaveModelDialogProps) {
  const [modelName, setModelName] = useState(existingModelName || "");
  const [isSaving, setIsSaving] = useState(false);

  // Keep the input in sync when editing an existing model
  useEffect(() => {
    setModelName(existingModelName || "");
  }, [existingModelName, open]);

  const handleSave = async () => {
    if (!modelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }
    if (!config.date_column || !config.segment_column || !config.dependent_variable) {
      toast.error("Configure date, segment, and dependent variable columns first");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save models");
        return;
      }

      const record = {
        user_id: user.id,
        model_name: modelName.trim(),
        model_type: config.model,
        date_column: config.date_column,
        segment_column: config.segment_column,
        dependent_variable: config.dependent_variable,
        prophet_params: (config.segments?.[0]?.prophet_params ?? null) as any,
        performance_metrics: config.performance_metrics as any,
        csv_data: csvData as any,
        forecast_results: forecastResults as any,
      };

      let modelId = existingModelId;

      if (existingModelId) {
        const { error } = await supabase
          .from("saved_models")
          .update(record)
          .eq("id", existingModelId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("saved_models")
          .insert(record)
          .select("id")
          .single();
        if (error) throw error;
        modelId = data.id;
      }

      if (!modelId) throw new Error("No model id returned");

      toast.success(existingModelId ? "Model updated" : "Model saved");
      onSaved(modelId, modelName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving model:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save model");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingModelId ? "Update Model" : "Save Model"}</DialogTitle>
          <DialogDescription>
            Save this model's configuration so you can generate and download a deployable model file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="model-name">Model Name</Label>
          <Input
            id="model-name"
            placeholder="e.g. Monthly Sales Forecast"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {existingModelId ? "Update" : "Save"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
