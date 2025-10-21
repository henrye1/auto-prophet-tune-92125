import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Bar, BarChart, Legend } from "recharts";
import { Activity, TrendingUp, Wand2, AlertCircle, CheckCircle2, Info, Plus, X, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getTransformationInfo } from "@/utils/dataAnalysis";

interface DataAnalysisToolsProps {
  data: any[];
  dateColumn: string;
  valueColumn: string;
  regressors?: string[];
  onTransformationApply: (transformation: any) => void;
}

export const DataAnalysisTools = ({ data, dateColumn, valueColumn, regressors, onTransformationApply }: DataAnalysisToolsProps) => {
  const [stationarityTest, setStationarityTest] = useState<any>(null);
  const [acfData, setAcfData] = useState<any>(null);
  const [pacfData, setPacfData] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stationarityVariable, setStationarityVariable] = useState<string>("dependent");
  const [acfVariable, setAcfVariable] = useState<string>("dependent");
  const [pacfVariable, setPacfVariable] = useState<string>("dependent");
  
  // Transformation workflow states
  const [currentVariable, setCurrentVariable] = useState<string>("dependent");
  const [currentTransformations, setCurrentTransformations] = useState<any[]>([]);
  const [selectedTransform, setSelectedTransform] = useState<string>("none");
  const [savedTransformations, setSavedTransformations] = useState<Record<string, any[]>>({});
  const [beforeTransformData, setBeforeTransformData] = useState<any[]>([]);
  const [afterTransformData, setAfterTransformData] = useState<any[]>([]);
  const [currentStationarityTest, setCurrentStationarityTest] = useState<any>(null);
  const [isStationary, setIsStationary] = useState<boolean>(false);

  // Prepare time series data for visualization
  const getTimeSeriesData = (variable: string) => {
    const column = variable === "dependent" ? valueColumn : variable;
    return data.slice(0, 100).map(row => ({
      date: row[dateColumn],
      value: parseFloat(row[column]) || 0,
    })).filter(d => !isNaN(d.value));
  };

  const runStationarityTest = () => {
    // Mock ADF test - in production, this would call a backend function
    const variableName = stationarityVariable === "dependent" ? valueColumn : stationarityVariable;
    const mockResult = {
      test_statistic: -2.5,
      p_value: 0.12,
      critical_values: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
      is_stationary: false,
      recommendation: `Data for "${variableName}" appears non-stationary. Consider differencing or detrending.`,
      variable: variableName,
    };
    setStationarityTest(mockResult);
  };

  const calculateACF = () => {
    // Mock ACF calculation
    const variableName = acfVariable === "dependent" ? valueColumn : acfVariable;
    const lags = Array.from({ length: 20 }, (_, i) => i);
    const correlations = lags.map(lag => Math.exp(-lag / 5) * (Math.random() * 0.4 + 0.6));
    setAcfData({
      lags,
      data: lags.map((lag, i) => ({ lag, correlation: correlations[i] })),
      confidence: 1.96 / Math.sqrt(data.length),
      variable: variableName,
    });
  };

  const calculatePACF = () => {
    // Mock PACF calculation
    const variableName = pacfVariable === "dependent" ? valueColumn : pacfVariable;
    const lags = Array.from({ length: 20 }, (_, i) => i);
    const correlations = lags.map(lag => lag === 0 ? 1 : Math.exp(-lag / 3) * (Math.random() - 0.5));
    setPacfData({
      lags,
      data: lags.map((lag, i) => ({ lag, correlation: correlations[i] })),
      confidence: 1.96 / Math.sqrt(data.length),
      variable: variableName,
    });
  };

  const getAIInsights = async () => {
    setIsAnalyzing(true);
    // Mock AI insights - in production, call Gemini
    setTimeout(() => {
      setAiInsights(
        "Based on the analysis:\n\n" +
        "1. The data shows non-stationarity with a p-value of 0.12\n" +
        "2. ACF shows slow decay, suggesting a trend component\n" +
        "3. PACF cuts off after lag 2, suggesting an AR(2) process\n\n" +
        "Recommendation: Apply first-order differencing to achieve stationarity, " +
        "then consider an ARIMA(2,1,0) model."
      );
      setIsAnalyzing(false);
    }, 1500);
  };

  // Get all available variables
  const allVariables = ['dependent', ...(regressors || [])];
  const getVariableDisplayName = (variable: string) => 
    variable === 'dependent' ? valueColumn : variable;
  
  // Check if dependent variable is processed and stationary
  const isDependentProcessed = () => {
    const depTransforms = savedTransformations['dependent'];
    return depTransforms && depTransforms.length > 0;
  };

  // Get available variables for processing
  const getAvailableVariables = () => {
    if (!isDependentProcessed()) {
      return ['dependent']; // Must process dependent first
    }
    return allVariables; // All variables available after dependent is done
  };

  const addTransformation = () => {
    if (selectedTransform !== "none") {
      // Capture before transformation data on first transform
      if (currentTransformations.length === 0) {
        setBeforeTransformData(getTimeSeriesData(currentVariable));
      }

      const newTransform = { 
        type: selectedTransform, 
        variable: currentVariable,
        applied: true 
      };
      const updatedTransforms = [...currentTransformations, newTransform];
      setCurrentTransformations(updatedTransforms);
      setSelectedTransform("none");
      
      // Simulate transformed data visualization
      setTimeout(() => {
        const originalData = getTimeSeriesData(currentVariable);
        // Mock transformation effect
        const transformed = originalData.map((d, i) => ({
          ...d,
          value: selectedTransform === 'log' ? Math.log(Math.abs(d.value) + 1) :
                 selectedTransform === 'difference' && i > 0 ? d.value - originalData[i-1].value :
                 d.value * 0.8 // Mock effect
        }));
        setAfterTransformData(transformed);

        // Run stationarity test automatically after transformation
        const mockTestAfter = {
          test_statistic: -2.5 - (updatedTransforms.length * 0.5), // Improve with each transform
          p_value: Math.max(0.001, 0.12 - (updatedTransforms.length * 0.04)),
          critical_values: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
          is_stationary: updatedTransforms.length >= 2, // Mock: stationary after 2 transforms
          recommendation: updatedTransforms.length >= 2 
            ? "Data is now stationary after transformation(s)." 
            : "Consider adding another transformation to achieve stationarity.",
        };
        setCurrentStationarityTest(mockTestAfter);
        setIsStationary(mockTestAfter.is_stationary);
      }, 500);
    }
  };

  const removeTransformation = (index: number) => {
    const updated = currentTransformations.filter((_, i) => i !== index);
    setCurrentTransformations(updated);
    if (updated.length === 0) {
      setCurrentStationarityTest(null);
      setBeforeTransformData([]);
      setAfterTransformData([]);
      setIsStationary(false);
    }
  };

  const saveTransformationForVariable = () => {
    // Save current transformations for this variable
    setSavedTransformations(prev => ({
      ...prev,
      [currentVariable]: currentTransformations
    }));

    // Reset current state
    setCurrentTransformations([]);
    setBeforeTransformData([]);
    setAfterTransformData([]);
    setCurrentStationarityTest(null);
    setIsStationary(false);
    setSelectedTransform("none");

    // Move to next variable if available
    const availableVars = getAvailableVariables();
    const currentIndex = availableVars.indexOf(currentVariable);
    if (currentIndex < availableVars.length - 1) {
      setCurrentVariable(availableVars[currentIndex + 1]);
    }
  };

  const resetCurrentVariable = () => {
    setCurrentTransformations([]);
    setBeforeTransformData([]);
    setAfterTransformData([]);
    setCurrentStationarityTest(null);
    setIsStationary(false);
    setSelectedTransform("none");
  };

  const applyAllTransformations = () => {
    // Combine all saved transformations
    const allTransforms = Object.entries(savedTransformations).flatMap(([variable, transforms]) =>
      transforms.map(t => ({ ...t, variable }))
    );
    
    if (allTransforms.length > 0) {
      onTransformationApply({ 
        transformations: allTransforms, 
        applied: true 
      });
    }
  };

  const TransformInfoButton = ({ type }: { type: string }) => {
    const info = getTransformationInfo(type);
    if (!info) return null;

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Info className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{info.name}</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div>
                <p className="font-semibold text-foreground">Description:</p>
                <p>{info.description}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">When to use:</p>
                <p>{info.useCase}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Example applications:</p>
                <p>{info.example}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Time Series Analysis Dashboard
          </CardTitle>
          <CardDescription>
            Comprehensive data analysis workflow - visualize, test, and transform your time series
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Section 1: Variable Selection & Visualization */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">1. Data Visualization & Variable Selection</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Start by visualizing your data - a modeler who doesn't look at their data is looking for problems.
            </p>
            <div className="space-y-2">
              <Label>Select Variable to Analyze</Label>
              <Select value={stationarityVariable} onValueChange={(val) => {
                setStationarityVariable(val);
                setAcfVariable(val);
                setPacfVariable(val);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dependent">Dependent Variable ({valueColumn})</SelectItem>
                  {regressors?.map(reg => (
                    <SelectItem key={reg} value={reg}>Regressor: {reg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Series Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Time Series Plot</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stationarityVariable === "dependent" ? valueColumn : stationarityVariable}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Visual inspection is the foundation of good modeling - always look at your data first. 
                  Showing original, untransformed data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getTimeSeriesData(stationarityVariable)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value: any) => [value.toFixed(2), stationarityVariable === "dependent" ? valueColumn : stationarityVariable]}
                    />
                    <Legend 
                      payload={[
                        { value: stationarityVariable === "dependent" ? valueColumn : stationarityVariable, type: 'line', color: 'hsl(var(--primary))' }
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name={stationarityVariable === "dependent" ? valueColumn : stationarityVariable}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Look for: trends (upward/downward movement), seasonality (repeating patterns), variance changes (heteroskedasticity)
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Section 2: Stationarity Testing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">2. Stationarity Test (ADF)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Test whether your data is stationary - statistical confirmation of what you see visually.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={runStationarityTest} variant="outline">
                Run Augmented Dickey-Fuller Test
              </Button>
              <Button onClick={getAIInsights} variant="outline" disabled={isAnalyzing}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isAnalyzing ? "Analyzing..." : "Get AI Insights"}
              </Button>
            </div>

            {stationarityTest && (
              <Alert variant={stationarityTest.is_stationary ? "default" : "destructive"}>
                {stationarityTest.is_stationary ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {stationarityTest.is_stationary ? "Data is stationary" : "Data is non-stationary"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Variable: <Badge variant="outline">{stationarityTest.variable}</Badge>
                    </p>
                    <div className="text-sm space-y-1">
                      <p>Test Statistic: {stationarityTest.test_statistic.toFixed(3)}</p>
                      <p>P-value: {stationarityTest.p_value.toFixed(3)}</p>
                      <p>Critical Values: 1%={stationarityTest.critical_values["1%"]}, 5%={stationarityTest.critical_values["5%"]}, 10%={stationarityTest.critical_values["10%"]}</p>
                    </div>
                    <p className="text-sm mt-2 italic">
                      💡 Remember: Statistical tests confirm what you should see visually. If the chart shows clear trends or changing variance, the data is likely non-stationary.
                    </p>
                    <p className="text-sm mt-2">{stationarityTest.recommendation}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {aiInsights && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    AI-Powered Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{aiInsights}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Section 3: ACF & PACF Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">3. Autocorrelation Analysis (ACF & PACF)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Understand temporal dependencies in your data - helps identify appropriate model orders.
            </p>
            <div className="flex gap-2">
              <Button onClick={calculateACF} variant="outline">
                Calculate ACF
              </Button>
              <Button onClick={calculatePACF} variant="outline">
                Calculate PACF
              </Button>
            </div>

            {acfData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Autocorrelation Function (ACF)</h4>
                    <Badge variant="outline">{acfData.variable}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={acfData.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="lag" label={{ value: "Lag", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Correlation", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <ReferenceLine y={acfData.confidence} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <ReferenceLine y={-acfData.confidence} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar dataKey="correlation" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Red dashed lines represent 95% confidence intervals. Bars extending beyond these lines indicate significant autocorrelation.
                </p>
              </CardContent>
            </Card>
            )}

            {pacfData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Partial Autocorrelation Function (PACF)</h4>
                    <Badge variant="outline">{pacfData.variable}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pacfData.data}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="lag" label={{ value: "Lag", position: "insideBottom", offset: -5 }} />
                    <YAxis label={{ value: "Correlation", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <ReferenceLine y={pacfData.confidence} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <ReferenceLine y={-pacfData.confidence} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar dataKey="correlation" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Red dashed lines represent 95% confidence intervals. Significant spikes suggest AR order.
                </p>
              </CardContent>
            </Card>
            )}
          </div>

          <Separator />

          {/* Section 4: Data Transformations - Iterative Workflow */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">4. Iterative Transformation Workflow</h3>
              </div>
              {isDependentProcessed() && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Dependent Variable Processed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Transform one variable at a time until stationary - visualize each step before proceeding.
            </p>

            {!isDependentProcessed() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Start with the dependent variable first. Once it's stationary, you can process regressors.
                </AlertDescription>
              </Alert>
            )}

            {/* Variable Selection & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Variable Selection & Processing Status</CardTitle>
                <CardDescription>Select a variable to transform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Currently Working On</Label>
                  <Select value={currentVariable} onValueChange={(val) => {
                    if (currentTransformations.length > 0) {
                      if (confirm("You have unsaved transformations. Switch variable anyway?")) {
                        setCurrentVariable(val);
                        resetCurrentVariable();
                      }
                    } else {
                      setCurrentVariable(val);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableVariables().map(variable => (
                        <SelectItem key={variable} value={variable}>
                          {variable === 'dependent' ? `Dependent Variable (${valueColumn})` : `Regressor: ${variable}`}
                          {savedTransformations[variable] && ` ✓ (${savedTransformations[variable].length} transforms saved)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Processing Status Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {allVariables.map(variable => {
                    const saved = savedTransformations[variable];
                    const isCurrent = variable === currentVariable;
                    return (
                      <div 
                        key={variable}
                        className={`p-2 rounded-md border text-xs ${
                          isCurrent ? 'border-primary bg-primary/5' :
                          saved ? 'border-green-500 bg-green-500/5' :
                          'border-muted bg-muted/50'
                        }`}
                      >
                        <div className="font-medium truncate">{getVariableDisplayName(variable)}</div>
                        <div className="text-muted-foreground">
                          {isCurrent ? '← Working' : 
                           saved ? `✓ ${saved.length} transforms` : 
                           '○ Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Current Variable Visualization - Before/During Transformation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>
                    {currentVariable === 'dependent' ? 'Dependent Variable' : 'Regressor'}: {getVariableDisplayName(currentVariable)}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {currentTransformations.length === 0 ? 'Original' : `${currentTransformations.length} Transform(s)`}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {currentTransformations.length === 0 
                    ? 'Original, untransformed data - apply transformations to achieve stationarity'
                    : `Data after ${currentTransformations.length} transformation(s) applied in sequence`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentTransformations.length === 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={getTimeSeriesData(currentVariable)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          angle={-45} 
                          textAnchor="end" 
                          height={60}
                          label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Original Value', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                          }}
                          labelFormatter={(value) => `Date: ${value}`}
                          formatter={(value: any) => [value.toFixed(2), getVariableDisplayName(currentVariable)]}
                        />
                        <Legend 
                          payload={[
                            { value: `${getVariableDisplayName(currentVariable)} (Original)`, type: 'line', color: 'hsl(var(--primary))' }
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name={getVariableDisplayName(currentVariable)}
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-muted-foreground">Before Transformation</h5>
                        <Badge variant="outline" className="text-xs">Original Data</Badge>
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={beforeTransformData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 9 }}
                            label={{ value: 'Date', position: 'insideBottom', offset: -5, fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 9 }}
                            label={{ value: 'Value', angle: -90, position: 'insideLeft', fontSize: 10 }}
                          />
                          <Tooltip
                            labelFormatter={(value) => `Date: ${value}`}
                            formatter={(value: any) => [value.toFixed(2), 'Original']}
                          />
                          <Legend 
                            payload={[
                              { value: `${getVariableDisplayName(currentVariable)} (Before)`, type: 'line', color: 'hsl(var(--destructive))' }
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            name="Original"
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={2} 
                            dot={false} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-muted-foreground">After Transformation(s)</h5>
                        <Badge variant="default" className="text-xs">
                          {currentTransformations.map((t: any) => getTransformationInfo(t.type)?.name.split(' ')[0]).join(' + ')}
                        </Badge>
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={afterTransformData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 9 }}
                            label={{ value: 'Date', position: 'insideBottom', offset: -5, fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 9 }}
                            label={{ value: 'Transformed Value', angle: -90, position: 'insideLeft', fontSize: 10 }}
                          />
                          <Tooltip
                            labelFormatter={(value) => `Date: ${value}`}
                            formatter={(value: any) => [value.toFixed(2), 'Transformed']}
                          />
                          <Legend 
                            payload={[
                              { value: `${getVariableDisplayName(currentVariable)} (Transformed)`, type: 'line', color: 'hsl(var(--chart-1))' }
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            name="Transformed"
                            stroke="hsl(var(--chart-1))" 
                            strokeWidth={2} 
                            dot={false} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transformation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Transformation</CardTitle>
                <CardDescription>Apply transformations one at a time and see immediate results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedTransform} onValueChange={setSelectedTransform}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose transformation..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a transformation</SelectItem>
                      <SelectItem value="log">Log Transform</SelectItem>
                      <SelectItem value="difference">First Difference</SelectItem>
                      <SelectItem value="seasonal_difference">Seasonal Difference</SelectItem>
                      <SelectItem value="box_cox">Box-Cox Transform</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTransform !== "none" && <TransformInfoButton type={selectedTransform} />}
                  <Button 
                    onClick={addTransformation} 
                    disabled={selectedTransform === "none"}
                    variant="default"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Apply
                  </Button>
                </div>

                {/* Current Transformation Chain */}
                {currentTransformations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Applied Transformations (in order)</Label>
                    <div className="space-y-1">
                      {currentTransformations.map((transform, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                            <span className="text-sm font-medium">
                              {getTransformationInfo(transform.type)?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TransformInfoButton type={transform.type} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => removeTransformation(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stationarity Test Results After Transformation */}
                {currentStationarityTest && (
                  <Alert variant={currentStationarityTest.is_stationary ? "default" : "destructive"}>
                    {currentStationarityTest.is_stationary ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">
                          Stationarity Test Result
                        </p>
                        <p className="text-sm">
                          {currentStationarityTest.is_stationary 
                            ? "✓ Data is now stationary! You can save these transformations." 
                            : "⚠ Data still non-stationary - add another transformation or save if satisfied."}
                        </p>
                        <div className="text-xs space-y-1">
                          <p>Test Statistic: {currentStationarityTest.test_statistic.toFixed(3)}</p>
                          <p>P-value: {currentStationarityTest.p_value.toFixed(3)}</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={saveTransformationForVariable}
                    disabled={currentTransformations.length === 0}
                    variant="default"
                    className="flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save & Move to Next Variable
                  </Button>
                  <Button 
                    onClick={resetCurrentVariable}
                    disabled={currentTransformations.length === 0}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comparison View: Dependent vs Regressors */}
            {Object.keys(savedTransformations).length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Multi-Variable Comparison (After Transformations)</CardTitle>
                  <CardDescription>
                    Compare all transformed variables side-by-side. Each line represents a different variable after its saved transformations have been applied.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show which transformations were applied to each */}
                  <div className="grid gap-2 text-xs">
                    {Object.entries(savedTransformations).map(([variable, transforms]) => (
                      <div key={variable} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Badge variant="outline" className="shrink-0">
                          {getVariableDisplayName(variable)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {transforms.map((t: any) => getTransformationInfo(t.type)?.name).join(' → ')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={getTimeSeriesData('dependent')}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        label={{ value: 'Transformed Values', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        iconType="line"
                        wrapperStyle={{ paddingBottom: '10px' }}
                      />
                      {Object.keys(savedTransformations).map((variable, index) => {
                        const varData = getTimeSeriesData(variable);
                        const colors = ['hsl(var(--primary))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
                        return (
                          <Line 
                            key={variable}
                            data={varData}
                            type="monotone" 
                            dataKey="value" 
                            name={getVariableDisplayName(variable)}
                            stroke={colors[index % colors.length]} 
                            strokeWidth={2}
                            dot={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                  
                  <p className="text-xs text-muted-foreground">
                    Note: This shows the original data for comparison. In the actual model, the saved transformations will be applied to each variable.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Final Apply All Button */}
            {Object.keys(savedTransformations).length > 0 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div>
                    <p className="font-semibold mb-1">Ready to Apply Transformations</p>
                    <p className="text-sm">
                      You have configured transformations for {Object.keys(savedTransformations).length} variable(s). 
                      Click below to apply all transformations to your model.
                    </p>
                  </div>
                  <Button 
                    onClick={applyAllTransformations}
                    className="w-full"
                  >
                    Apply All Transformations to Model
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Iterative Transformation Workflow:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Select a transformation and click "Apply" to see immediate results</li>
                  <li>Add more transformations iteratively until data is stationary</li>
                  <li>Click "Save & Move to Next" when satisfied with the variable</li>
                  <li>Process dependent variable first, then move to regressors</li>
                  <li>Visual comparison is more reliable than any statistical test</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};
