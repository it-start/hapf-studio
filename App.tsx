import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Code2, 
  FileText, 
  Activity,
  TableProperties,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';
import { 
  LogLevel, 
  LogEntry, 
  PipelineStatus, 
  Artifacts 
} from './types';
import { INITIAL_HAPF_CODE, DEFAULT_INPUT_TEXT } from './constants';
import * as geminiService from './services/geminiService';
import Console from './components/Console';
import PipelineVisualizer from './components/PipelineVisualizer';
import CodeBlock from './components/CodeBlock';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Helper for generating IDs
const uid = () => Math.random().toString(36).substr(2, 9);

function App() {
  // --- State ---
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(PipelineStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>({ 
    transactions: null, 
    categorized: null, 
    insights: null, 
    summary: null 
  });
  const [activeTab, setActiveTab] = useState<'visual' | 'artifacts' | 'metrics'>('visual');
  const [inputText, setInputText] = useState(DEFAULT_INPUT_TEXT);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Logging Helper ---
  const addLog = useCallback((message: string, level: LogLevel = LogLevel.INFO, module?: string) => {
    const entry: LogEntry = {
      id: uid(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + "." + new Date().getMilliseconds().toString().padStart(3, '0'),
      level,
      message,
      module
    };
    setLogs(prev => [...prev, entry]);
  }, []);

  // --- Pipeline Execution Logic ---
  const handleRun = useCallback(async () => {
    if (pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED) return;
    
    // Reset state
    setLogs([]);
    setArtifacts({ transactions: null, categorized: null, insights: null, summary: null });
    setPipelineStatus(PipelineStatus.INGESTING);
    setActiveTab('visual');
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    addLog(`Loading module "finance-insight-generator"`, LogLevel.SYSTEM);
    addLog(`Environment: gemini-2.5-flash | Determinism: STRICT`, LogLevel.SYSTEM);

    try {
      // --- STEP 1: INGEST CSV ---
      addLog("Starting Module: ingest.csv", LogLevel.INFO, "INGEST");
      
      const transactions = await geminiService.runIngestCsv(inputText);
      setArtifacts(prev => ({ ...prev, transactions }));
      addLog(`Parsed ${transactions.length} transactions from CSV.`, LogLevel.SUCCESS, "INGEST");
      
      // --- STEP 2: CATEGORIZE ---
      setPipelineStatus(PipelineStatus.CATEGORIZING);
      addLog("Starting Module: categorize.transactions", LogLevel.INFO, "CATEGORIZE");
      
      const categorized = await geminiService.runCategorizeTransactions(transactions);
      setArtifacts(prev => ({ ...prev, categorized }));
      addLog(`Categorized ${categorized.length} transactions successfully.`, LogLevel.SUCCESS, "CATEGORIZE");
      
      // --- STEP 3: ANALYZE ---
      setPipelineStatus(PipelineStatus.ANALYZING);
      addLog("Starting Module: analyze.spending", LogLevel.INFO, "ANALYZE");
      
      const insights = await geminiService.runAnalyzeSpending(categorized);
      setArtifacts(prev => ({ ...prev, insights }));
      addLog(`Analysis complete. Largest Category: ${insights.largest_category}`, LogLevel.SUCCESS, "ANALYZE");
      addLog(`Total Spend: $${insights.total_spending}`, LogLevel.INFO, "ANALYZE");

      // --- STEP 4: SUMMARY ---
      setPipelineStatus(PipelineStatus.SUMMARIZING);
      addLog("Starting Module: generate.summary", LogLevel.INFO, "SUMMARY");
      
      const summary = await geminiService.runGenerateSummary(insights);
      setArtifacts(prev => ({ ...prev, summary }));
      addLog("Executive summary generated.", LogLevel.SUCCESS, "SUMMARY");

      // --- COMPLETE ---
      setPipelineStatus(PipelineStatus.COMPLETE);
      addLog("Pipeline execution finished successfully.", LogLevel.SUCCESS, "SYSTEM");

    } catch (error: any) {
      console.error(error);
      addLog(`Pipeline crashed: ${error.message || "Unknown error"}`, LogLevel.ERROR, "SYSTEM");
      setPipelineStatus(PipelineStatus.FAILED);
    }
  }, [inputText, pipelineStatus, addLog]);

  const handleReset = () => {
    setPipelineStatus(PipelineStatus.IDLE);
    setLogs([]);
    setArtifacts({ transactions: null, categorized: null, insights: null, summary: null });
  };

  // --- Render Helpers ---

  const renderArtifacts = () => {
    if (!artifacts.categorized && !artifacts.insights) {
      return <div className="flex items-center justify-center h-full text-hapf-muted">No artifacts generated yet. Run the pipeline.</div>;
    }
    return (
      <div className="space-y-6 p-4 font-mono text-sm">
        
        {artifacts.summary && (
          <div className="bg-hapf-panel border border-hapf-success/30 rounded p-4">
             <h3 className="text-hapf-success font-bold mb-2 flex items-center gap-2"><FileText size={16}/> Executive Summary</h3>
             <p className="text-hapf-text leading-relaxed">
                {artifacts.summary.text}
             </p>
          </div>
        )}

        {artifacts.insights && (
            <div className="bg-hapf-panel border border-hapf-primary/30 rounded p-4">
                 <h3 className="text-hapf-primary font-bold mb-4 flex items-center gap-2"><PieChart size={16}/> Spending Breakdown</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(artifacts.insights.spending_per_category || {}).map(([name, value]) => ({ name, value }))}>
                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`}/>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                itemStyle={{ color: '#3b82f6' }}
                                cursor={{fill: '#27272a'}}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                {Object.entries(artifacts.insights.spending_per_category || {}).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry[0] === artifacts.insights?.largest_category ? '#f59e0b' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="mt-4 flex gap-4 text-xs">
                     <div className="bg-black/30 p-2 rounded border border-hapf-border flex-1">
                         <div className="text-hapf-muted uppercase">Total</div>
                         <div className="text-lg font-bold text-white">${(artifacts.insights.total_spending || 0).toFixed(2)}</div>
                     </div>
                     <div className="bg-black/30 p-2 rounded border border-hapf-border flex-1">
                         <div className="text-hapf-muted uppercase">Top Category</div>
                         <div className="text-lg font-bold text-hapf-warning">{artifacts.insights.largest_category || 'N/A'}</div>
                     </div>
                 </div>
            </div>
        )}

        {artifacts.categorized && (
          <div className="bg-hapf-panel border border-hapf-accent/30 rounded p-4">
             <h3 className="text-hapf-accent font-bold mb-2 flex items-center gap-2"><TableProperties size={16}/> Categorized Ledger</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="text-hapf-muted border-b border-hapf-border">
                            <th className="py-2">Date</th>
                            <th className="py-2">Description</th>
                            <th className="py-2">Category</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {artifacts.categorized.map((item, idx) => (
                            <tr key={idx} className="border-b border-hapf-border/50 hover:bg-white/5">
                                <td className="py-2 text-hapf-muted">{item.transaction?.date || '-'}</td>
                                <td className="py-2">{item.transaction?.description || '-'}</td>
                                <td className="py-2 text-hapf-accent">{item.category || 'Uncategorized'}</td>
                                <td className="py-2 text-right font-mono">${(item.transaction?.amount || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
     const data = [
        { name: 'Ingest CSV', latency: 320, cost: 0.001 },
        { name: 'Categorize', latency: 1500, cost: 0.012 },
        { name: 'Analyze', latency: 600, cost: 0.005 },
        { name: 'Summary', latency: 450, cost: 0.003 },
     ];

     return (
        <div className="p-4 h-full flex flex-col">
            <h3 className="text-hapf-text font-bold mb-4 flex items-center gap-2"><Activity size={16}/> Runtime Telemetry</h3>
            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                            itemStyle={{ color: '#3b82f6' }}
                            cursor={{fill: '#27272a'}}
                        />
                        <Bar dataKey="latency" name="Latency (ms)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-hapf-panel p-3 rounded border border-hapf-border">
                    <div className="text-xs text-hapf-muted uppercase">Total Tokens</div>
                    <div className="text-xl font-bold text-hapf-primary">~2,150</div>
                </div>
                <div className="bg-hapf-panel p-3 rounded border border-hapf-border">
                    <div className="text-xs text-hapf-muted uppercase">Est. Cost</div>
                    <div className="text-xl font-bold text-hapf-success">$0.0008</div>
                </div>
            </div>
        </div>
     );
  };

  return (
    <div className="flex flex-col h-screen bg-hapf-bg text-hapf-text font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-hapf-border flex items-center justify-between px-6 bg-hapf-panel select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-hapf-primary to-hapf-accent rounded-md flex items-center justify-center font-bold text-white shadow-lg shadow-hapf-primary/20">
            H
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm">HAPF Studio <span className="text-xs font-normal text-hapf-muted ml-1">v1.0.0</span></h1>
            <div className="text-[10px] text-hapf-success uppercase tracking-wider font-bold">Connected: Gemini 2.5 Flash</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-hapf-border">
                <button 
                  onClick={handleRun}
                  disabled={pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    pipelineStatus === PipelineStatus.IDLE || pipelineStatus === PipelineStatus.COMPLETE || pipelineStatus === PipelineStatus.FAILED
                    ? 'bg-hapf-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20' 
                    : 'bg-hapf-border text-hapf-muted cursor-not-allowed opacity-50'
                  }`}
                >
                  {pipelineStatus === PipelineStatus.INGESTING ? <Activity className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3 fill-current" />}
                  RUN PIPELINE
                </button>
                <button 
                    onClick={handleReset}
                    className="p-1.5 hover:bg-hapf-border rounded text-hapf-muted hover:text-white transition-colors"
                    title="Reset Runtime"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
             </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Editor & Input */}
        <div className="w-1/2 flex flex-col border-r border-hapf-border">
            {/* Top: HAPF Code Editor */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="h-8 bg-hapf-panel border-b border-hapf-border flex items-center px-4 gap-2 text-xs font-mono text-hapf-muted">
                    <Code2 className="w-3 h-3"/>
                    <span>finance-insight-generator.hapf</span>
                    <span className="ml-auto opacity-50">Read-Only</span>
                </div>
                <div className="flex-1 bg-[#0d0d10] overflow-hidden">
                    <CodeBlock code={INITIAL_HAPF_CODE} />
                </div>
            </div>

            {/* Bottom: Simulated Input */}
            <div className="h-1/3 border-t border-hapf-border flex flex-col bg-hapf-panel/50">
                <div className="h-8 px-4 flex items-center border-b border-hapf-border text-xs font-mono text-hapf-muted">
                    <FileSpreadsheet className="w-3 h-3 mr-2"/>
                    <span>transactions.csv (Input Stream)</span>
                </div>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-transparent p-4 text-sm font-mono text-hapf-text outline-none resize-none placeholder-hapf-muted/30"
                    placeholder="Enter CSV data here..."
                />
            </div>
        </div>

        {/* Right Panel: Visualization & Runtime */}
        <div className="w-1/2 flex flex-col bg-hapf-bg relative">
            
            {/* Tabs */}
            <div className="flex border-b border-hapf-border bg-hapf-panel px-2">
                <button 
                    onClick={() => setActiveTab('visual')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'visual' ? 'border-hapf-primary text-hapf-primary' : 'border-transparent text-hapf-muted hover:text-hapf-text'}`}
                >
                    VISUALIZER
                </button>
                <button 
                    onClick={() => setActiveTab('artifacts')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'artifacts' ? 'border-hapf-accent text-hapf-accent' : 'border-transparent text-hapf-muted hover:text-hapf-text'}`}
                >
                    ARTIFACTS
                </button>
                <button 
                    onClick={() => setActiveTab('metrics')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'metrics' ? 'border-hapf-success text-hapf-success' : 'border-transparent text-hapf-muted hover:text-hapf-text'}`}
                >
                    METRICS
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto relative">
                 {activeTab === 'visual' && (
                     <div className="h-full flex flex-col">
                        <div className="h-1/2 min-h-[250px] border-b border-hapf-border">
                            <PipelineVisualizer status={pipelineStatus} />
                        </div>
                        <div className="flex-1 min-h-0">
                            <Console logs={logs} />
                        </div>
                     </div>
                 )}
                 {activeTab === 'artifacts' && (
                     <div className="h-full overflow-y-auto">
                        {renderArtifacts()}
                     </div>
                 )}
                 {activeTab === 'metrics' && (
                     <div className="h-full">
                         {renderMetrics()}
                     </div>
                 )}
            </div>
            
            {/* Status Bar */}
            <div className="h-6 bg-hapf-primary/10 border-t border-hapf-primary/20 flex items-center px-4 text-[10px] font-mono text-hapf-primary justify-between">
                <span>STATUS: {pipelineStatus}</span>
                <span>HEAP: 64MB</span>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;