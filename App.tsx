import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Code2, 
  FileText, 
  Activity,
  Layers,
  Box,
  FileJson,
  ChevronDown,
  GitGraph,
  Github,
  X,
  Lock,
  Globe,
  Cpu
} from 'lucide-react';
import { 
  LogLevel, 
  LogEntry, 
  PipelineStatus, 
  Artifacts,
  GithubConfig
} from './types';
import { PIPELINE_EXAMPLES } from './constants';
import * as geminiService from './services/geminiService';
import * as githubService from './services/githubService';
import Console from './components/Console';
import HapfDiagram from './components/HapfDiagram';
import CodeBlock from './components/CodeBlock';
import HapfEditor from './components/HapfEditor';
import { BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar } from 'recharts';

// Helper for generating IDs
const uid = () => Math.random().toString(36).substr(2, 9);

function App() {
  // --- State ---
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(PipelineStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>({ 
    files: null, 
    architecture: null, 
    spec: null,
    genericOutput: null
  });
  const [activeTab, setActiveTab] = useState<'visual' | 'diagram' | 'artifacts' | 'metrics'>('visual');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  // Example Selection State
  const [selectedExampleKey, setSelectedExampleKey] = useState<string>("reverse-engineer");
  const [editorCode, setEditorCode] = useState(PIPELINE_EXAMPLES["reverse-engineer"].code);
  const [inputText, setInputText] = useState(PIPELINE_EXAMPLES["reverse-engineer"].input);

  // GitHub State
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [useGithub, setUseGithub] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ repoUrl: '', token: '' });
  
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

  // --- Example Switching ---
  const handleExampleChange = (key: string) => {
    if (PIPELINE_EXAMPLES[key]) {
      setSelectedExampleKey(key);
      setEditorCode(PIPELINE_EXAMPLES[key].code);
      setInputText(PIPELINE_EXAMPLES[key].input);
      // Reset pipeline state
      setPipelineStatus(PipelineStatus.IDLE);
      setLogs([]);
      setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null });
      setActiveModule(null);
    }
  };

  // --- Pipeline Execution Logic ---
  const handleRun = useCallback(async () => {
    if (pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED) return;
    
    // Reset state
    setLogs([]);
    setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null });
    setActiveModule(null);
    
    // Switch to visualizer on run
    if (activeTab !== 'visual') {
        setActiveTab('visual');
    }
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    addLog(`Loading module package...`, LogLevel.SYSTEM);
    
    try {
      setPipelineStatus(PipelineStatus.INGESTING);
      let runtimeInput = inputText;

      // --- OPTIONAL: GITHUB INGESTION ---
      if (useGithub && githubConfig.repoUrl) {
         try {
             addLog(`Connecting to GitHub: ${githubConfig.repoUrl}...`, LogLevel.INFO, "GITHUB_CONNECTOR");
             const files = await githubService.fetchGithubRepo(
                 githubConfig.repoUrl, 
                 githubConfig.token, 
                 (msg) => addLog(msg, LogLevel.INFO, "GITHUB_API")
             );
             addLog(`Fetched ${files.length} files from repository.`, LogLevel.SUCCESS, "INGEST");
             
             // Inject GitHub data as the input for the simulation
             runtimeInput = JSON.stringify({
                 repo_path: githubConfig.repoUrl,
                 files: files.map(f => ({ path: f.path, content_preview: f.content_hint }))
             }, null, 2);
             
             setArtifacts(prev => ({ ...prev, files }));
         } catch (e: any) {
             throw new Error(`GitHub Error: ${e.message}`);
         }
      }

      // --- GENERIC PIPELINE SIMULATION ---
      setPipelineStatus(PipelineStatus.ANALYZING);
      addLog("Starting Pipeline Execution Simulation...", LogLevel.SYSTEM);
      
      const result = await geminiService.runGenericPipelineSimulation(editorCode, runtimeInput);
      
      setPipelineStatus(PipelineStatus.GENERATING); // Using 'Generating' as 'Running'

      // Replay steps with animation
      const steps = result.steps || [];
      
      for (const step of steps) {
          // Highlight module in Visualizer
          setActiveModule(step.module);
          
          // Add Log
          const preview = step.data_preview ? ` [Data: ${step.data_preview}]` : '';
          addLog(`${step.message}${preview}`, LogLevel.INFO, step.module);
          
          // Delay for visual effect (800ms)
          await new Promise(r => setTimeout(r, 800));
      }
      
      setActiveModule(null);
      setArtifacts(prev => ({ ...prev, genericOutput: result.output }));
      addLog("Execution completed successfully.", LogLevel.SUCCESS, "SYSTEM");
      
      setPipelineStatus(PipelineStatus.COMPLETE);

    } catch (error: any) {
      console.error(error);
      addLog(`Pipeline crashed: ${error.message || "Unknown error"}`, LogLevel.ERROR, "SYSTEM");
      setPipelineStatus(PipelineStatus.FAILED);
    }
  }, [inputText, pipelineStatus, addLog, activeTab, useGithub, githubConfig, editorCode]);

  const handleReset = () => {
    setPipelineStatus(PipelineStatus.IDLE);
    setLogs([]);
    setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null });
    setActiveModule(null);
  };

  const isRunDisabled = pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED;

  // --- Render Helpers ---

  const renderArtifacts = () => {
    if (!artifacts.files && !artifacts.architecture && !artifacts.genericOutput) {
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

        {artifacts.files && (
          <div className="bg-hapf-panel border border-hapf-accent/30 rounded p-4">
             <h3 className="text-hapf-accent font-bold mb-2 flex items-center gap-2"><Box size={16}/> Ingested Files (Live)</h3>
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

        {artifacts.genericOutput && (
            <div className="bg-hapf-panel border border-hapf-primary/30 rounded p-4 flex flex-col gap-3">
                <h3 className="text-hapf-primary font-bold flex items-center gap-2"><Box size={16}/> Pipeline Output</h3>
                <div className="bg-black p-3 rounded border border-hapf-border overflow-auto max-h-[500px]">
                    <pre className="text-hapf-text font-mono text-xs whitespace-pre-wrap">
                        {JSON.stringify(artifacts.genericOutput, null, 2)}
                    </pre>
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderMetrics = () => {
     const data = [
        { name: 'Ingest', latency: useGithub ? 1200 : 450, cost: useGithub ? 0.0 : 0.002 },
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
      
      {/* GitHub Connection Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-hapf-panel border border-hapf-border w-[500px] rounded-lg shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Github /> Connect Repository</h2>
                    <button onClick={() => setShowGithubModal(false)} className="text-hapf-muted hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-hapf-muted uppercase mb-1">Repository URL</label>
                        <div className="flex items-center gap-2 bg-black border border-hapf-border rounded px-3 py-2 focus-within:border-hapf-primary">
                            <Globe size={16} className="text-hapf-muted"/>
                            <input 
                                type="text" 
                                className="bg-transparent w-full outline-none text-sm font-mono"
                                placeholder="https://github.com/owner/repo"
                                value={githubConfig.repoUrl}
                                onChange={(e) => setGithubConfig({...githubConfig, repoUrl: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-hapf-muted uppercase mb-1">
                            Access Token <span className="text-[10px] font-normal lowercase">(optional, for private repos)</span>
                        </label>
                        <div className="flex items-center gap-2 bg-black border border-hapf-border rounded px-3 py-2 focus-within:border-hapf-primary">
                            <Lock size={16} className="text-hapf-muted"/>
                            <input 
                                type="password" 
                                className="bg-transparent w-full outline-none text-sm font-mono"
                                placeholder="ghp_..."
                                value={githubConfig.token}
                                onChange={(e) => setGithubConfig({...githubConfig, token: e.target.value})}
                            />
                        </div>
                        <p className="text-[10px] text-hapf-muted mt-2">
                            Token is stored in memory only. We fetch the file tree and read content of configuration files (package.json, etc.) to generate the HAPF spec.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={() => {
                                setUseGithub(true);
                                setShowGithubModal(false);
                            }}
                            className="flex-1 bg-hapf-primary hover:bg-blue-600 text-white py-2 rounded font-bold text-sm transition-colors"
                        >
                            Connect & Use
                        </button>
                        <button 
                             onClick={() => {
                                 setUseGithub(false);
                                 setGithubConfig({ repoUrl: '', token: '' });
                                 setShowGithubModal(false);
                             }}
                            className="px-4 py-2 border border-hapf-border hover:bg-hapf-border rounded font-bold text-sm transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

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
             <button 
                onClick={() => setShowGithubModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                    useGithub 
                    ? 'bg-hapf-panel border-hapf-success text-hapf-success' 
                    : 'bg-transparent border-hapf-border text-hapf-muted hover:text-white hover:border-hapf-text'
                }`}
             >
                <Github className="w-3 h-3" />
                {useGithub ? 'GIT CONNECTED' : 'CONNECT GITHUB'}
             </button>

             <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-hapf-border">
                <button 
                  onClick={handleRun}
                  disabled={isRunDisabled}
                  title="Execute Pipeline"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    !isRunDisabled
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
                <div className="h-10 bg-hapf-panel border-b border-hapf-border flex items-center px-4 gap-2 text-xs font-mono text-hapf-muted justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3 h-3"/>
                      <span>SOURCE:</span>
                    </div>
                    
                    {/* Example Selector */}
                    <div className="relative group">
                      <select 
                        value={selectedExampleKey}
                        onChange={(e) => handleExampleChange(e.target.value)}
                        className="bg-[#09090b] text-hapf-text border border-hapf-border rounded px-2 py-1 appearance-none pr-8 cursor-pointer focus:border-hapf-primary outline-none transition-colors hover:border-hapf-muted"
                      >
                        {Object.entries(PIPELINE_EXAMPLES).map(([key, example]) => (
                          <option key={key} value={key}>{example.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-hapf-muted pointer-events-none"/>
                    </div>
                </div>
                <div className="flex-1 bg-[#0d0d10] overflow-hidden relative">
                    <HapfEditor 
                        value={editorCode}
                        onChange={setEditorCode}
                    />
                </div>
            </div>

            {/* Bottom: Input (Synthetic or GitHub Status) */}
            <div className="h-1/3 border-t border-hapf-border flex flex-col bg-hapf-panel/50">
                <div className="h-8 px-4 flex items-center border-b border-hapf-border text-xs font-mono text-hapf-muted justify-between">
                    <div className="flex items-center gap-2">
                        {useGithub ? <Github className="w-3 h-3 text-hapf-success"/> : <FileJson className="w-3 h-3"/>}
                        <span>{useGithub ? 'REAL INPUT (GITHUB)' : 'VIRTUAL INPUT (JSON)'}</span>
                    </div>
                </div>
                {useGithub ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-hapf-muted p-4 text-center">
                        <Github className="w-12 h-12 mb-2 opacity-50"/>
                        <p className="font-bold text-hapf-text">{githubConfig.repoUrl}</p>
                        <p className="text-xs mt-1">Input is now pulled directly from the live repository.</p>
                        <p className="text-[10px] mt-2 opacity-50">Click "Run Pipeline" to fetch and analyze latest commit.</p>
                    </div>
                ) : (
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 bg-transparent p-4 text-sm font-mono text-hapf-text outline-none resize-none placeholder-hapf-muted/30"
                        placeholder="Enter JSON config here..."
                        spellCheck={false}
                    />
                )}
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
                    RUNTIME
                </button>
                <button 
                    onClick={() => setActiveTab('diagram')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'diagram' ? 'border-hapf-warning text-hapf-warning' : 'border-transparent text-hapf-muted hover:text-hapf-text'}`}
                >
                    <GitGraph size={12} /> DIAGRAM
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
            <div className="flex-1 overflow-auto relative bg-[#09090b]">
                 {activeTab === 'visual' && (
                     <div className="h-full flex flex-col">
                        <div className="h-1/2 min-h-[250px] border-b border-hapf-border relative">
                            {/* LIVE Runtime Visualizer using HapfDiagram */}
                            <HapfDiagram code={editorCode} activeModule={activeModule} />
                            
                            {/* Overlay if not running */}
                            {pipelineStatus === PipelineStatus.IDLE && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                                    <div className="bg-hapf-panel/90 border border-hapf-border p-4 rounded text-center backdrop-blur-sm">
                                        <Play className="w-8 h-8 mx-auto mb-2 text-hapf-primary"/>
                                        <p className="text-hapf-text font-bold text-xs">READY TO START</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0">
                            <Console logs={logs} />
                        </div>
                     </div>
                 )}
                 {activeTab === 'diagram' && (
                     <div className="h-full w-full">
                         <HapfDiagram code={editorCode} />
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
                <span>SOURCE: {useGithub ? 'LIVE GITHUB API' : 'VIRTUAL MOCK'}</span>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;