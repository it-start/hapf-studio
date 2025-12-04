import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Code2, 
  FileText, 
  Activity,
  Layers,
  Box,
  FileJson
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Helper for generating IDs
const uid = () => Math.random().toString(36).substr(2, 9);

function App() {
  // --- State ---
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(PipelineStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>({ 
    files: null, 
    architecture: null, 
    spec: null
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
    setArtifacts({ files: null, architecture: null, spec: null });
    setPipelineStatus(PipelineStatus.INGESTING);
    setActiveTab('visual');
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    addLog(`Loading module "hapf-web-studio-self-reflection"`, LogLevel.SYSTEM);
    addLog(`Environment: gemini-2.5-flash | Context: Simulated Self-Reflection`, LogLevel.SYSTEM);

    try {
      // --- STEP 1: INGEST VIRTUAL FS ---
      addLog("Starting Module: ingest.virtual_fs", LogLevel.INFO, "INGEST");
      
      const files = await geminiService.runIngestFiles(inputText);
      setArtifacts(prev => ({ ...prev, files }));
      addLog(`Ingested ${files.length} virtual files from config.`, LogLevel.SUCCESS, "INGEST");
      
      // --- STEP 2: ANALYZE ARCHITECTURE ---
      setPipelineStatus(PipelineStatus.ANALYZING);
      addLog("Starting Module: analyze.architecture", LogLevel.INFO, "ANALYZE");
      
      const architecture = await geminiService.runAnalyzeArchitecture(files);
      setArtifacts(prev => ({ ...prev, architecture }));
      addLog(`Detected Framework: ${architecture.framework}`, LogLevel.SUCCESS, "ANALYZE");
      addLog(`Found ${architecture.dependencies.length} dependencies and ${architecture.store_keys.length} state keys.`, LogLevel.INFO, "ANALYZE");
      
      // --- STEP 3: GENERATE SPEC ---
      setPipelineStatus(PipelineStatus.GENERATING);
      addLog("Starting Module: generate.spec", LogLevel.INFO, "GENERATE");
      
      const spec = await geminiService.runGenerateSpec(architecture);
      setArtifacts(prev => ({ ...prev, spec }));
      addLog("HAPF Specification generated successfully.", LogLevel.SUCCESS, "GENERATE");

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
    setArtifacts({ files: null, architecture: null, spec: null });
  };

  // --- Render Helpers ---

  const renderArtifacts = () => {
    if (!artifacts.files && !artifacts.architecture) {
      return <div className="flex items-center justify-center h-full text-hapf-muted">No artifacts generated yet. Run the pipeline.</div>;
    }
    return (
      <div className="space-y-6 p-4 font-mono text-sm">
        
        {artifacts.spec && (
          <div className="bg-hapf-panel border border-hapf-success/30 rounded p-4 flex flex-col gap-3">
             <h3 className="text-hapf-success font-bold flex items-center gap-2"><FileText size={16}/> Generated HAPF Spec</h3>
             <p className="text-hapf-muted text-xs">{artifacts.spec.description}</p>
             <div className="bg-black p-3 rounded border border-hapf-border max-h-64 overflow-auto">
                 <CodeBlock code={artifacts.spec.hapf_code} />
             </div>
          </div>
        )}

        {artifacts.architecture && (
            <div className="bg-hapf-panel border border-hapf-primary/30 rounded p-4">
                 <h3 className="text-hapf-primary font-bold mb-4 flex items-center gap-2"><Layers size={16}/> Architecture Analysis</h3>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs text-hapf-muted uppercase mb-2">Dependencies</h4>
                        <div className="flex flex-wrap gap-2">
                            {artifacts.architecture.dependencies.map(d => (
                                <span key={d} className="px-2 py-1 bg-hapf-primary/10 text-hapf-primary rounded text-xs border border-hapf-primary/20">{d}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs text-hapf-muted uppercase mb-2">State Keys (Store)</h4>
                        <div className="flex flex-wrap gap-2">
                            {artifacts.architecture.store_keys.map(k => (
                                <span key={k} className="px-2 py-1 bg-hapf-accent/10 text-hapf-accent rounded text-xs border border-hapf-accent/20">{k}</span>
                            ))}
                        </div>
                    </div>
                 </div>

                 <div className="mt-4 pt-4 border-t border-hapf-border">
                     <div className="flex justify-between items-center">
                         <span className="text-hapf-muted">Detected Framework</span>
                         <span className="font-bold text-white bg-hapf-border px-2 py-1 rounded">{artifacts.architecture.framework}</span>
                     </div>
                 </div>
            </div>
        )}

        {artifacts.files && (
          <div className="bg-hapf-panel border border-hapf-accent/30 rounded p-4">
             <h3 className="text-hapf-accent font-bold mb-2 flex items-center gap-2"><Box size={16}/> Ingested Virtual Files</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="text-hapf-muted border-b border-hapf-border">
                            <th className="py-2">Path</th>
                            <th className="py-2">Intent</th>
                            <th className="py-2">Content Hint</th>
                        </tr>
                    </thead>
                    <tbody>
                        {artifacts.files.map((file, idx) => (
                            <tr key={idx} className="border-b border-hapf-border/50 hover:bg-white/5">
                                <td className="py-2 text-hapf-text font-bold">{file.path}</td>
                                <td className="py-2 text-hapf-accent">{file.intent}</td>
                                <td className="py-2 text-hapf-muted truncate max-w-[150px]">{file.content_hint}</td>
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
        { name: 'Ingest', latency: 450, cost: 0.002 },
        { name: 'Analyze', latency: 2100, cost: 0.015 },
        { name: 'Generate', latency: 3200, cost: 0.025 },
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
                    <div className="text-xl font-bold text-hapf-primary">~4,500</div>
                </div>
                <div className="bg-hapf-panel p-3 rounded border border-hapf-border">
                    <div className="text-xs text-hapf-muted uppercase">Est. Cost</div>
                    <div className="text-xl font-bold text-hapf-success">$0.0018</div>
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
                  {pipelineStatus === PipelineStatus.INGESTING || pipelineStatus === PipelineStatus.ANALYZING || pipelineStatus === PipelineStatus.GENERATING ? <Activity className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3 fill-current" />}
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
                    <span>reverse_engineer_repo.hapf</span>
                    <span className="ml-auto opacity-50">Read-Only</span>
                </div>
                <div className="flex-1 bg-[#0d0d10] overflow-hidden">
                    <CodeBlock code={INITIAL_HAPF_CODE} />
                </div>
            </div>

            {/* Bottom: Simulated Input */}
            <div className="h-1/3 border-t border-hapf-border flex flex-col bg-hapf-panel/50">
                <div className="h-8 px-4 flex items-center border-b border-hapf-border text-xs font-mono text-hapf-muted">
                    <FileJson className="w-3 h-3 mr-2"/>
                    <span>runtime_patch.conf (JSON)</span>
                </div>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-transparent p-4 text-sm font-mono text-hapf-text outline-none resize-none placeholder-hapf-muted/30"
                    placeholder="Enter JSON config here..."
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
                <span>STRATEGY: MAP-REDUCE</span>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;