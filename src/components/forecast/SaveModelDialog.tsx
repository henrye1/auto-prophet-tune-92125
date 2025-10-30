import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ForecastConfig } from "@/types/forecast";

interface SaveModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ForecastConfig;
  existingModelId?: string;
  existingModelName?: string;
}

export function SaveModelDialog({
  open,
  onOpenChange,
  config,
  existingModelId,
  existingModelName,
}: SaveModelDialogProps) {
  const [modelName, setModelName] = useState(existingModelName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!modelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save models");
        setSaving(false);
        return;
      }

      if (existingModelId) {
        // Update existing model
        const { error: updateError } = await supabase
          .from("saved_models")
          .update({
            model_name: modelName,
            model_type: config.model,
            date_column: config.date_column,
            segment_column: config.segment_column,
            dependent_variable: config.dependent_variable,
            prophet_params: config.prophet_params as any,
            autogluon_params: config.autogluon_params as any,
            traditional_params: config.traditional_params as any,
            performance_metrics: config.performance_metrics as any,
          })
          .eq("id", existingModelId);

        if (updateError) throw updateError;

        // Delete existing segments
        await supabase
          .from("model_segments")
          .delete()
          .eq("model_id", existingModelId);

        // Insert new segments
        const segmentsData = config.segments.map((segment) => ({
          model_id: existingModelId,
          segment: segment.segment,
          segment_value: segment.segmentValue,
          regressors: segment.regressors as any,
          forecast_periods: segment.forecast_periods,
          frequency: segment.frequency,
          total_records: segment.total_records,
          training_records: segment.training_records,
          test_records: segment.test_records,
          prophet_params: segment.prophet_params as any,
          autogluon_params: segment.autogluon_params as any,
          traditional_params: segment.traditional_params as any,
        }));

        const { error: segmentsError } = await supabase
          .from("model_segments")
          .insert(segmentsData);

        if (segmentsError) throw segmentsError;

        toast.success("Model updated successfully!");
      } else {
        // Create new model
        const { data: modelData, error: modelError } = await supabase
          .from("saved_models")
          .insert([{
            user_id: user.id,
            model_name: modelName,
            model_type: config.model,
            date_column: config.date_column,
            segment_column: config.segment_column,
            dependent_variable: config.dependent_variable,
            prophet_params: config.prophet_params as any,
            autogluon_params: config.autogluon_params as any,
            traditional_params: config.traditional_params as any,
            performance_metrics: config.performance_metrics as any,
          }])
          .select()
          .single();

        if (modelError) throw modelError;

        // Insert segments
        const segmentsData = config.segments.map((segment) => ({
          model_id: modelData.id,
          segment: segment.segment,
          segment_value: segment.segmentValue,
          regressors: segment.regressors as any,
          forecast_periods: segment.forecast_periods,
          frequency: segment.frequency,
          total_records: segment.total_records,
          training_records: segment.training_records,
          test_records: segment.test_records,
          prophet_params: segment.prophet_params as any,
          autogluon_params: segment.autogluon_params as any,
          traditional_params: segment.traditional_params as any,
        }));

        const { error: segmentsError } = await supabase
          .from("model_segments")
          .insert(segmentsData);

        if (segmentsError) throw segmentsError;

        toast.success("Model saved successfully!");
      }

      onOpenChange(false);
      setModelName("");
    } catch (error) {
      console.error("Error saving model:", error);
      toast.error("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingModelId ? "Update Model" : "Save Model"}</DialogTitle>
          <DialogDescription>
            {existingModelId
              ? "Update the name and configuration of your model"
              : "Give your model a name to save it for later use"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="modelName">Model Name</Label>
            <Input
              id="modelName"
              placeholder="e.g., Q1 Sales Forecast"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingModelId ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
