import { useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle2, X } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface DataUploadProps {
  onDataLoaded: (data: any[], headers: string[]) => void;
  onClear: () => void;
  hasData: boolean;
}

export const DataUpload = ({ onDataLoaded, onClear, hasData }: DataUploadProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [rowCount, setRowCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error("Error parsing CSV file");
          console.error(results.errors);
          setIsProcessing(false);
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data;

        if (headers.length === 0 || data.length === 0) {
          toast.error("CSV file is empty or invalid");
          setIsProcessing(false);
          return;
        }

        setRowCount(data.length);
        onDataLoaded(data, headers);
        toast.success(`Successfully loaded ${data.length} rows with ${headers.length} columns`);
        setIsProcessing(false);
      },
      error: (error) => {
        toast.error(`Error reading file: ${error.message}`);
        setIsProcessing(false);
      },
    });
  }, [onDataLoaded]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processFile(file);
    // Reset the input
    event.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClear = () => {
    setFileName("");
    setRowCount(0);
    onClear();
    toast.info("Data cleared");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Data Upload
        </CardTitle>
        <CardDescription>Upload your time series data in CSV format</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="text-sm mb-2">
                <span className="text-primary font-semibold">Click to upload</span> or drag and drop
              </div>
              <div className="text-xs text-muted-foreground">CSV files only</div>
            </Label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            {isProcessing && (
              <div className="mt-4 text-sm text-muted-foreground">Processing file...</div>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg p-4 bg-accent/5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">{fileName}</div>
                  <div className="text-sm text-muted-foreground">
                    {rowCount.toLocaleString()} rows loaded
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>📋 Your CSV should contain:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>A date/timestamp column</li>
            <li>One or more dependent variable columns (segments)</li>
            <li>Optional: regressor/covariate columns</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
