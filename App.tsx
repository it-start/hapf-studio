import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Cpu, 
  Layers, 
  FileJson, 
  FileText, 
  Activity,
  Code2
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
  const [artifacts, setArtifacts] = useState<Artifacts>({ insights: null, outline: null, draft: null });
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
    setArtifacts({ insights: null, outline: null, draft: null });
    setPipelineStatus(PipelineStatus.INGESTING);
    setActiveTab('visual');
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    addLog(`Loading module "chaos-writer-pro"`, LogLevel.SYSTEM);
    addLog(`Environment: gemini-2.5-flash | Determinism: STRICT`, LogLevel.SYSTEM);

    try {
      // --- STEP 1: INGEST ---
      addLog("Starting Module: ingest.thought_extractor", LogLevel.INFO, "INGEST");
      addLog(`Stream strategy active. Processing input buffer (${inputText.length} chars)`, LogLevel.INFO, "INGEST");
      
      const insights = await geminiService.runIngestModule(inputText);
      setArtifacts(prev => ({ ...prev, insights }));
      addLog(`Extracted ${insights.length} insights from raw stream.`, LogLevel.SUCCESS, "INGEST");
      insights.forEach(i => addLog(`> [${i.topic}] ${i.source_text.substring(0, 40)}... (Imp: ${i.importance})`, LogLevel.INFO, "INGEST"));

      // --- STEP 2: PLAN ---
      setPipelineStatus(PipelineStatus.PLANNING);
      addLog("Starting Module: plan.architect", LogLevel.INFO, "PLAN");
      
      const outline = await geminiService.runArchitectModule(insights);
      setArtifacts(prev => ({ ...prev, outline }));
      addLog(`Blueprint generated: "${outline.title}"`, LogLevel.SUCCESS, "PLAN");
      addLog(`Defined ${outline.sections.length} logical sections.`, LogLevel.INFO, "PLAN");

      // --- STEP 3: WRITE (Map-Reduce Simulation) ---
      setPipelineStatus(PipelineStatus.WRITING);
      addLog("Starting Module: write.section_expander", LogLevel.INFO, "WRITE");
      addLog(`Spawning ${outline.sections.length} parallel workers (Map-Reduce)...`, LogLevel.WARN, "WRITE");

      const sectionPromises = outline.sections.map(async (section) => {
        addLog(`Worker started for section: ${section.header}`, LogLevel.INFO, "WRITE");
        const text = await geminiService.runWriterModule(section.header, section.key_points);
        addLog(`Worker finished section: ${section.header} (${text.length} chars)`, LogLevel.SUCCESS, "WRITE");
        return text;
      });

      const sectionTexts = await Promise.all(sectionPromises);
      const fullDraftText = sectionTexts.join("\n\n");
      addLog("All workers returned. Reducing to single artifact.", LogLevel.SYSTEM, "WRITE");

      // --- STEP 4: QA ---
      setPipelineStatus(PipelineStatus.REVIEWING);
      addLog("Starting Module: qa.critic", LogLevel.INFO, "QA");
      
      const review = await geminiService.runCriticModule(fullDraftText);
      setArtifacts(prev => ({ ...prev, draft: review }));
      
      addLog(`Critic Score: ${review.readability_score}`, review.readability_score > 0.7 ? LogLevel.SUCCESS : LogLevel.WARN, "QA");
      if (review.hallucination_check_passed) {
        addLog("Hallucination check passed.", LogLevel.SUCCESS, "QA");
      } else {
        addLog("Hallucination check FAILED.", LogLevel.ERROR, "QA");
      }

      // --- COMPLETE ---
      setPipelineStatus(PipelineStatus.COMPLETE);
      addLog("Pipeline execution finished successfully.", LogLevel.SUCCESS, "SYSTEM");
      addLog("Artifact 'article.md' ready for export.", LogLevel.SYSTEM, "SYSTEM");

    } catch (error: any) {
      console.error(error);
      addLog(`Pipeline crashed: ${error.message || "Unknown error"}`, LogLevel.ERROR, "SYSTEM");
      setPipelineStatus(PipelineStatus.FAILED);
    }
  }, [inputText, pipelineStatus, addLog]);

  const handleReset = () => {
    setPipelineStatus(PipelineStatus.IDLE);
    setLogs([]);
    setArtifacts({ insights: null, outline: null, draft: null });
  };

  // --- Render Helpers ---

  const renderArtifacts = () => {
    if (!artifacts.insights && !artifacts.outline && !artifacts.draft) {
      return <div className="flex items-center justify-center h-full text-hapf-muted">No artifacts generated yet. Run the pipeline.</div>;
    }
    return (
      <div className="space-y-6 p-4 font-mono text-sm">
        {artifacts.draft && (
            <div className="bg-hapf-panel border border-hapf-success/30 rounded p-4">
            <h3 className="text-hapf-success font-bold mb-2 flex items-center gap-2"><FileText size={16}/> Final Draft</h3>
            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-hapf-text bg-black/30 p-2 rounded">
                {artifacts.draft.content_markdown}
            </div>
            </div>
        )}
        {artifacts.outline && (
          <div className="bg-hapf-panel border border-hapf-primary/30 rounded p-4">
            <h3 className="text-hapf-primary font-bold mb-2 flex items-center gap-2"><Layers size={16}/> Structure</h3>
            <ul className="list-disc pl-5 space-y-1 text-hapf-text">
              {artifacts.outline.sections.map((s, i) => (
                <li key={i}>
                  <span className="font-bold">{s.header}</span> <span className="text-xs text-hapf-muted">({s.estimated_tokens} tokens)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {artifacts.insights && (
          <div className="bg-hapf-panel border border-hapf-accent/30 rounded p-4">
             <h3 className="text-hapf-accent font-bold mb-2 flex items-center gap-2"><FileJson size={16}/> Insights JSON</h3>
             <pre className="text-xs overflow-x-auto">{JSON.stringify(artifacts.insights, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
     const data = [
        { name: 'Ingest', latency: 120, cost: 0.002 },
        { name: 'Plan', latency: 450, cost: 0.005 },
        { name: 'Write', latency: 2100, cost: 0.015 },
        { name: 'QA', latency: 800, cost: 0.003 },
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
                    <div className="text-xl font-bold text-hapf-primary">~4,250</div>
                </div>
                <div className="bg-hapf-panel p-3 rounded border border-hapf-border">
                    <div className="text-xs text-hapf-muted uppercase">Est. Cost</div>
                    <div className="text-xl font-bold text-hapf-success">$0.0012</div>
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
                    <span>chaos-writer-pro.hapf</span>
                    <span className="ml-auto opacity-50">Read-Only</span>
                </div>
                <div className="flex-1 bg-[#0d0d10] overflow-hidden">
                    <CodeBlock code={INITIAL_HAPF_CODE} />
                </div>
            </div>

            {/* Bottom: Simulated Input (brain_dump.txt) */}
            <div className="h-1/3 border-t border-hapf-border flex flex-col bg-hapf-panel/50">
                <div className="h-8 px-4 flex items-center border-b border-hapf-border text-xs font-mono text-hapf-muted">
                    <FileText className="w-3 h-3 mr-2"/>
                    <span>brain_dump.txt (Input Stream)</span>
                </div>
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-transparent p-4 text-sm font-mono text-hapf-text outline-none resize-none placeholder-hapf-muted/30"
                    placeholder="Enter your raw text here..."
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
                <span>HEAP: 42MB</span>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;
