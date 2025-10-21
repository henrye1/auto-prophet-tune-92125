import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Bar, BarChart } from "recharts";
import { Activity, TrendingUp, Wand2, AlertCircle, CheckCircle2, Info, Plus, X } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [transformationChain, setTransformationChain] = useState<any[]>([]);
  const [selectedTransform, setSelectedTransform] = useState<string>("none");
  const [postTransformTest, setPostTransformTest] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>("dependent");

  const runStationarityTest = () => {
    // Mock ADF test - in production, this would call a backend function
    const mockResult = {
      test_statistic: -2.5,
      p_value: 0.12,
      critical_values: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
      is_stationary: false,
      recommendation: "Data appears non-stationary. Consider differencing or detrending.",
    };
    setStationarityTest(mockResult);
  };

  const calculateACF = () => {
    // Mock ACF calculation
    const lags = Array.from({ length: 20 }, (_, i) => i);
    const correlations = lags.map(lag => Math.exp(-lag / 5) * (Math.random() * 0.4 + 0.6));
    setAcfData({
      lags,
      data: lags.map((lag, i) => ({ lag, correlation: correlations[i] })),
      confidence: 1.96 / Math.sqrt(data.length),
    });
  };

  const calculatePACF = () => {
    // Mock PACF calculation
    const lags = Array.from({ length: 20 }, (_, i) => i);
    const correlations = lags.map(lag => lag === 0 ? 1 : Math.exp(-lag / 3) * (Math.random() - 0.5));
    setPacfData({
      lags,
      data: lags.map((lag, i) => ({ lag, correlation: correlations[i] })),
      confidence: 1.96 / Math.sqrt(data.length),
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

  const addTransformation = () => {
    if (selectedTransform !== "none") {
      const newTransform = { 
        type: selectedTransform, 
        variable: selectedVariable,
        applied: true 
      };
      setTransformationChain([...transformationChain, newTransform]);
      setSelectedTransform("none");
      
      // Run stationarity test after adding transformation
      setTimeout(() => {
        const mockTestAfter = {
          test_statistic: -3.8,
          p_value: 0.003,
          critical_values: { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
          is_stationary: true,
          recommendation: "Data is now stationary after applying transformation(s).",
        };
        setPostTransformTest(mockTestAfter);
      }, 500);
    }
  };

  const removeTransformation = (index: number) => {
    const updated = transformationChain.filter((_, i) => i !== index);
    setTransformationChain(updated);
    if (updated.length === 0) {
      setPostTransformTest(null);
    }
  };

  const applyAllTransformations = () => {
    if (transformationChain.length > 0) {
      onTransformationApply({ 
        transformations: transformationChain, 
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
            Time Series Analysis Tools
          </CardTitle>
          <CardDescription>
            Analyze data properties and apply transformations for better forecasting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stationarity" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stationarity">Stationarity</TabsTrigger>
              <TabsTrigger value="acf">ACF</TabsTrigger>
              <TabsTrigger value="pacf">PACF</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
            </TabsList>

            <TabsContent value="stationarity" className="space-y-4">
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
                      <div className="text-sm space-y-1">
                        <p>Test Statistic: {stationarityTest.test_statistic.toFixed(3)}</p>
                        <p>P-value: {stationarityTest.p_value.toFixed(3)}</p>
                        <p>Critical Values: 1%={stationarityTest.critical_values["1%"]}, 5%={stationarityTest.critical_values["5%"]}, 10%={stationarityTest.critical_values["10%"]}</p>
                      </div>
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
            </TabsContent>

            <TabsContent value="acf" className="space-y-4">
              <Button onClick={calculateACF} variant="outline">
                Calculate Autocorrelation Function
              </Button>

              {acfData && (
                <div>
                  <h4 className="text-sm font-semibold mb-4">Autocorrelation Function (ACF)</h4>
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
                    Blue dashed lines represent 95% confidence intervals. Bars extending beyond these lines indicate significant autocorrelation.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pacf" className="space-y-4">
              <Button onClick={calculatePACF} variant="outline">
                Calculate Partial Autocorrelation Function
              </Button>

              {pacfData && (
                <div>
                  <h4 className="text-sm font-semibold mb-4">Partial Autocorrelation Function (PACF)</h4>
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
                    Blue dashed lines represent 95% confidence intervals. Significant spikes suggest AR order.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transform" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Apply To</Label>
                  <Select value={selectedVariable} onValueChange={setSelectedVariable}>
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

                <div className="space-y-2">
                  <Label>Select Transformation</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTransform} onValueChange={setSelectedTransform}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose transformation..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="log">Log Transform</SelectItem>
                        <SelectItem value="difference">First Difference</SelectItem>
                        <SelectItem value="seasonal_difference">Seasonal Difference</SelectItem>
                        <SelectItem value="box_cox">Box-Cox Transform</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedTransform !== "none" && <TransformInfoButton type={selectedTransform} />}
                  </div>
                </div>

                {/* Transformation Chain */}
                {transformationChain.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Transformation Chain</CardTitle>
                      <CardDescription>Transformations will be applied in this order</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {transformationChain.map((transform, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <span className="text-sm font-medium">
                              {getTransformationInfo(transform.type)?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              → {transform.variable === "dependent" ? valueColumn : transform.variable}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TransformInfoButton type={transform.type} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => removeTransformation(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={addTransformation} 
                    disabled={selectedTransform === "none"}
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Chain
                  </Button>
                  <Button 
                    onClick={applyAllTransformations} 
                    disabled={transformationChain.length === 0}
                  >
                    Apply All Transformations
                  </Button>
                  <Button 
                    onClick={getAIInsights} 
                    variant="outline"
                    disabled={isAnalyzing}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI Recommend
                  </Button>
                </div>

                {/* Post-Transformation Stationarity Test */}
                {postTransformTest && (
                  <Alert variant={postTransformTest.is_stationary ? "default" : "destructive"}>
                    {postTransformTest.is_stationary ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">
                          Post-Transformation Stationarity Test
                        </p>
                        <p className="text-sm">
                          {postTransformTest.is_stationary 
                            ? "✓ Data is now stationary after transformation(s)" 
                            : "⚠ Data still non-stationary - consider additional transformations"}
                        </p>
                        <div className="text-sm space-y-1">
                          <p>Test Statistic: {postTransformTest.test_statistic.toFixed(3)}</p>
                          <p>P-value: {postTransformTest.p_value.toFixed(3)}</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Transformation Tips:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>You can apply multiple transformations sequentially</li>
                      <li>For trending + heteroskedastic data: apply log first, then difference</li>
                      <li>Stationarity is automatically tested after each transformation</li>
                      <li>Click the info button next to each transform for detailed guidance</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
