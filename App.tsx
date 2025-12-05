
import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Code2, 
  Activity,
  Box,
  FileJson,
  ChevronDown,
  GitGraph,
  Github,
  X,
  Lock,
  Globe,
  Settings,
  Cpu,
  Zap,
  Key,
  Workflow,
  Download,
  Database
} from 'lucide-react';
import { 
  LogLevel, 
  LogEntry, 
  PipelineStatus, 
  Artifacts,
  GithubConfig,
  ProviderConfig,
  AIProvider,
  N8nConfig,
  RunMetrics,
  SimulationStep
} from './types';
import { PIPELINE_EXAMPLES } from './constants';
import * as geminiService from './services/geminiService';
import * as githubService from './services/githubService';
import Console from './components/Console';
import HapfDiagram from './components/HapfDiagram';
import HapfEditor from './components/HapfEditor';
import ArtifactViewer from './components/ArtifactViewer';
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
    genericOutput: null,
    n8n_workflow: null
  });
  const [activeTab, setActiveTab] = useState<'visual' | 'diagram' | 'artifacts' | 'metrics'>('visual');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  // Metrics State
  const [runMetrics, setRunMetrics] = useState<RunMetrics | null>(null);
  const [stepsForMetrics, setStepsForMetrics] = useState<SimulationStep[]>([]);

  // Example Selection State
  const [selectedExampleKey, setSelectedExampleKey] = useState<string>("reverse-engineer");
  const [editorCode, setEditorCode] = useState(PIPELINE_EXAMPLES["reverse-engineer"].code);
  const [inputText, setInputText] = useState(PIPELINE_EXAMPLES["reverse-engineer"].input);

  // GitHub State
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [useGithub, setUseGithub] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ repoUrl: '', token: '' });

  // N8n State
  const [n8nConfig, setN8nConfig] = useState<N8nConfig>({ instanceUrl: 'https://your-n8n.com', apiKey: '' });

  // AI Provider State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'models' | 'integrations' | 'system'>('models');
  
  const [providers, setProviders] = useState<Record<AIProvider, ProviderConfig>>({
    [AIProvider.GOOGLE]: { provider: AIProvider.GOOGLE, enabled: true, defaultModel: 'gemini-2.5-flash', apiKey: 'env-var-managed' },
    [AIProvider.MISTRAL]: { provider: AIProvider.MISTRAL, enabled: false, defaultModel: 'mistral-large', apiKey: '' },
    [AIProvider.COHERE]: { provider: AIProvider.COHERE, enabled: false, defaultModel: 'command-r-plus', apiKey: '' },
    [AIProvider.UNKNOWN]: { provider: AIProvider.UNKNOWN, enabled: false, defaultModel: '' }
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Logging Helper ---
  const addLog = useCallback((message: string, level: LogLevel = LogLevel.INFO, module?: string, provider?: AIProvider) => {
    const entry: LogEntry = {
      id: uid(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + "." + new Date().getMilliseconds().toString().padStart(3, '0'),
      level,
      message,
      module,
      provider
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
      setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null, n8n_workflow: null });
      setActiveModule(null);
      setRunMetrics(null);
      setStepsForMetrics([]);
    }
  };

  // --- Export Library ---
  const handleExportLibrary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(PIPELINE_EXAMPLES, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "hapf_examples_library.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("Exported HAPF Examples Library.", LogLevel.SUCCESS, "SYSTEM");
  };

  // --- Pipeline Execution Logic ---
  const handleRun = useCallback(async () => {
    if (pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED) return;
    
    // Reset state
    setLogs([]);
    setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null, n8n_workflow: null });
    setActiveModule(null);
    setRunMetrics(null);
    setStepsForMetrics([]);
    
    // Switch to visualizer on run
    if (activeTab !== 'visual') {
        setActiveTab('visual');
    }
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    
    // Log Active Providers
    const activeProviders = Object.values(providers)
      .filter(p => p.enabled)
      .map(p => `${p.provider}${p.apiKey ? ' (PROD)' : ' (SIM)'}`);
    addLog(`Active Model Registry: ${activeProviders.join(', ')}`, LogLevel.SYSTEM);
    
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
      addLog("Starting Multi-Model Pipeline Execution...", LogLevel.SYSTEM);
      
      const startTime = performance.now();
      const result = await geminiService.runGenericPipelineSimulation(editorCode, runtimeInput, providers);
      const endTime = performance.now();

      // Capture Metrics
      const latency = Math.round(endTime - startTime);
      const promptTokens = result.usage?.promptTokenCount || 0;
      const completionTokens = result.usage?.candidatesTokenCount || 0;
      const totalTokens = result.usage?.totalTokenCount || 0;
      
      // Cost Calculation (Using approx Gemini 2.5 Flash pricing - similar to 1.5 Flash)
      // Input: $0.075 / 1M tokens, Output: $0.30 / 1M tokens
      const cost = ((promptTokens * 0.075) + (completionTokens * 0.30)) / 1000000;
      
      setRunMetrics({
          totalLatencyMs: latency,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: cost
      });

      setStepsForMetrics(result.steps || []);

      setPipelineStatus(PipelineStatus.GENERATING); // Using 'Generating' as 'Running'

      // Replay steps with animation
      const steps = result.steps || [];
      
      for (const step of steps) {
          // Highlight module in Visualizer
          setActiveModule(step.module);
          
          // Determine Provider based on log message or module naming convention (heuristic for simulation)
          let stepProvider = AIProvider.GOOGLE; // Default
          
          // Heuristics for demo purposes since we are simulating
          if (step.message.toLowerCase().includes('mistral') || editorCode.includes(`module "${step.module}"`) && editorCode.includes('mistral')) {
              stepProvider = AIProvider.MISTRAL;
          } else if (step.message.toLowerCase().includes('cohere') || editorCode.includes(`module "${step.module}"`) && editorCode.includes('cohere')) {
              stepProvider = AIProvider.COHERE;
          }

          // Add Log
          const preview = step.data_preview ? ` [Data: ${step.data_preview}]` : '';
          addLog(`${step.message}${preview}`, LogLevel.INFO, step.module, stepProvider);
          
          // Delay for visual effect (800ms)
          await new Promise(r => setTimeout(r, 800));
      }
      
      setActiveModule(null);
      setArtifacts(prev => ({ ...prev, genericOutput: result.output }));
      
      // --- N8N COMPILATION TRIGGER ---
      // If this is the n8n example, run the compiler service in parallel/after
      if (selectedExampleKey === 'n8n-integration') {
          addLog("Compiling pipeline to n8n Workflow...", LogLevel.SYSTEM, "COMPILER");
          const n8nWorkflow = await geminiService.runCompileToN8n(editorCode, n8nConfig.instanceUrl);
          setArtifacts(prev => ({ ...prev, n8n_workflow: n8nWorkflow }));
          addLog("Compilation complete! n8n JSON generated.", LogLevel.SUCCESS, "COMPILER");
      }

      addLog("Execution completed successfully.", LogLevel.SUCCESS, "SYSTEM");
      
      setPipelineStatus(PipelineStatus.COMPLETE);

    } catch (error: any) {
      console.error(error);
      addLog(`Pipeline crashed: ${error.message || "Unknown error"}`, LogLevel.ERROR, "SYSTEM");
      setPipelineStatus(PipelineStatus.FAILED);
    }
  }, [inputText, pipelineStatus, addLog, activeTab, useGithub, githubConfig, editorCode, providers, selectedExampleKey, n8nConfig]);

  const handleReset = () => {
    setPipelineStatus(PipelineStatus.IDLE);
    setLogs([]);
    setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null, n8n_workflow: null });
    setActiveModule(null);
    setRunMetrics(null);
    setStepsForMetrics([]);
  };

  const isRunDisabled = pipelineStatus !== PipelineStatus.IDLE && pipelineStatus !== PipelineStatus.COMPLETE && pipelineStatus !== PipelineStatus.FAILED;

  // --- Render Helpers ---

  const renderMetrics = () => {
     if (!runMetrics) {
         return (
             <div className="flex flex-col items-center justify-center h-full text-hapf-muted opacity-40 select-none">
                <Activity size={64} strokeWidth={0.5} />
                <p className="mt-4 text-sm font-mono">No telemetry available.</p>
                <p className="text-xs">Run a pipeline to generate metrics.</p>
            </div>
         );
     }

     // Generate chart data based on step output length (proxy for complexity/tokens per step)
     const chartData = stepsForMetrics.map(step => ({
         name: step.module.replace('mod-', '').replace('runtime.', '').split('.').pop(), // Short name
         complexity: step.message.length + (step.data_preview?.length || 0),
         fullModule: step.module
     }));

     return (
        <div className="p-4 h-full flex flex-col overflow-y-auto">
            <h3 className="text-hapf-text font-bold mb-4 flex items-center gap-2">
                <Activity size={16}/> 
                Runtime Telemetry
                <span className="text-[10px] bg-hapf-primary/10 text-hapf-primary px-2 py-0.5 rounded border border-hapf-primary/20">LIVE DATA</span>
            </h3>
            
            {/* Top Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-hapf-panel p-4 rounded border border-hapf-border relative overflow-hidden group">
                    <div className="text-xs text-hapf-muted uppercase font-bold z-10 relative">Total Latency</div>
                    <div className="text-2xl font-bold text-white mt-1 z-10 relative font-mono">{runMetrics.totalLatencyMs.toLocaleString()} ms</div>
                    <Activity className="absolute -right-2 -bottom-2 w-16 h-16 text-hapf-primary/10 group-hover:text-hapf-primary/20 transition-colors" />
                </div>
                <div className="bg-hapf-panel p-4 rounded border border-hapf-border relative overflow-hidden group">
                    <div className="text-xs text-hapf-muted uppercase font-bold z-10 relative">Est. Cost</div>
                    <div className="text-2xl font-bold text-hapf-success mt-1 z-10 relative font-mono">${runMetrics.estimatedCost.toFixed(6)}</div>
                    <div className="text-[10px] text-hapf-muted mt-1 z-10 relative opacity-60">Based on Flash pricing</div>
                    <Zap className="absolute -right-2 -bottom-2 w-16 h-16 text-hapf-success/10 group-hover:text-hapf-success/20 transition-colors" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                 <div className="bg-black/30 p-2 rounded border border-hapf-border">
                     <div className="text-[10px] text-hapf-muted uppercase">Prompt Tokens</div>
                     <div className="text-sm font-bold text-hapf-primary font-mono">{runMetrics.promptTokens.toLocaleString()}</div>
                 </div>
                 <div className="bg-black/30 p-2 rounded border border-hapf-border">
                     <div className="text-[10px] text-hapf-muted uppercase">Output Tokens</div>
                     <div className="text-sm font-bold text-hapf-accent font-mono">{runMetrics.completionTokens.toLocaleString()}</div>
                 </div>
                 <div className="bg-black/30 p-2 rounded border border-hapf-border">
                     <div className="text-[10px] text-hapf-muted uppercase">Total</div>
                     <div className="text-sm font-bold text-white font-mono">{runMetrics.totalTokens.toLocaleString()}</div>
                 </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[250px] bg-hapf-panel/50 border border-hapf-border rounded-lg p-4">
                <div className="text-xs font-bold text-hapf-muted mb-4 uppercase">Simulated Complexity by Module (Output Density)</div>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis 
                            dataKey="name" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false}/>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff', fontSize: '12px' }}
                            itemStyle={{ color: '#3b82f6' }}
                            cursor={{fill: '#27272a'}}
                            formatter={(value: any) => [value, 'Chars Generated']}
                        />
                        <Bar dataKey="complexity" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
     );
  };

  const toggleProvider = (key: AIProvider) => {
      setProviders(prev => ({
          ...prev,
          [key]: { ...prev[key], enabled: !prev[key].enabled }
      }));
  };

  const updateProviderKey = (key: AIProvider, apiKey: string) => {
      setProviders(prev => ({
          ...prev,
          [key]: { ...prev[key], apiKey }
      }));
  };

  return (
    <div className="flex flex-col h-screen bg-hapf-bg text-hapf-text font-sans overflow-hidden">
      
      {/* Settings Modal */}
      {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-hapf-panel border border-hapf-border w-[600px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-hapf-border bg-black/20 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={18} /> Studio Settings</h2>
                    <button onClick={() => setShowSettingsModal(false)} className="text-hapf-muted hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex border-b border-hapf-border bg-black/40">
                    <button 
                        onClick={() => setActiveSettingsTab('models')}
                        className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'models' ? 'border-hapf-primary text-hapf-primary bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
                    >
                        MODEL REGISTRY
                    </button>
                    <button 
                         onClick={() => setActiveSettingsTab('integrations')}
                         className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'integrations' ? 'border-hapf-accent text-hapf-accent bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
                    >
                        INTEGRATIONS
                    </button>
                    <button 
                         onClick={() => setActiveSettingsTab('system')}
                         className={`px-6 py-3 text-xs font-bold transition-colors border-b-2 ${activeSettingsTab === 'system' ? 'border-hapf-success text-hapf-success bg-white/5' : 'border-transparent text-hapf-muted hover:text-white'}`}
                    >
                        SYSTEM
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {/* MODEL REGISTRY TAB */}
                    {activeSettingsTab === 'models' && (
                        <div className="space-y-3">
                            {/* Google */}
                            <div className="border border-hapf-border rounded-lg p-4 bg-black/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">G</div>
                                    <div>
                                        <div className="font-bold text-sm">Google Gemini</div>
                                        <div className="text-xs text-hapf-muted">gemini-2.5-flash (Default)</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded">CONNECTED</span>
                                </div>
                            </div>

                            {/* Mistral */}
                            <div className={`border rounded-lg p-4 bg-black/30 transition-colors ${providers[AIProvider.MISTRAL].enabled ? 'border-orange-500/50' : 'border-hapf-border'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded flex items-center justify-center font-bold transition-colors ${providers[AIProvider.MISTRAL].enabled ? 'bg-orange-500/20 text-orange-500' : 'bg-hapf-border text-hapf-muted'}`}>M</div>
                                        <div>
                                            <div className="font-bold text-sm">Mistral AI</div>
                                            <div className="text-xs text-hapf-muted">mistral-large, mixtral-8x7b</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleProvider(AIProvider.MISTRAL)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${providers[AIProvider.MISTRAL].enabled ? 'bg-orange-500 text-white border-orange-600' : 'bg-transparent border-hapf-border hover:bg-white/5'}`}
                                    >
                                        {providers[AIProvider.MISTRAL].enabled ? 'ENABLED' : 'ENABLE'}
                                    </button>
                                </div>
                                {/* API Key Input */}
                                {providers[AIProvider.MISTRAL].enabled && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 animate-in slide-in-from-top-2">
                                        <Key size={14} className="text-orange-500" />
                                        <input 
                                            type="password"
                                            placeholder="Enter Mistral API Key (sk-...)"
                                            className="flex-1 bg-black/40 border border-hapf-border rounded px-2 py-1 text-xs text-hapf-text outline-none focus:border-orange-500 transition-colors placeholder:text-hapf-muted/30"
                                            value={providers[AIProvider.MISTRAL].apiKey || ''}
                                            onChange={(e) => updateProviderKey(AIProvider.MISTRAL, e.target.value)}
                                        />
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${providers[AIProvider.MISTRAL].apiKey ? 'text-green-400 bg-green-500/10' : 'text-hapf-muted bg-white/5'}`}>
                                            {providers[AIProvider.MISTRAL].apiKey ? 'PROD MODE' : 'SIMULATOR'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Cohere */}
                            <div className={`border rounded-lg p-4 bg-black/30 transition-colors ${providers[AIProvider.COHERE].enabled ? 'border-teal-500/50' : 'border-hapf-border'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded flex items-center justify-center font-bold transition-colors ${providers[AIProvider.COHERE].enabled ? 'bg-teal-500/20 text-teal-500' : 'bg-hapf-border text-hapf-muted'}`}>C</div>
                                        <div>
                                            <div className="font-bold text-sm">Cohere</div>
                                            <div className="text-xs text-hapf-muted">command-r-plus</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleProvider(AIProvider.COHERE)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${providers[AIProvider.COHERE].enabled ? 'bg-teal-500 text-white border-teal-600' : 'bg-transparent border-hapf-border hover:bg-white/5'}`}
                                    >
                                        {providers[AIProvider.COHERE].enabled ? 'ENABLED' : 'ENABLE'}
                                    </button>
                                </div>
                                {/* API Key Input */}
                                {providers[AIProvider.COHERE].enabled && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 animate-in slide-in-from-top-2">
                                        <Key size={14} className="text-teal-500" />
                                        <input 
                                            type="password"
                                            placeholder="Enter Cohere API Key (production)"
                                            className="flex-1 bg-black/40 border border-hapf-border rounded px-2 py-1 text-xs text-hapf-text outline-none focus:border-teal-500 transition-colors placeholder:text-hapf-muted/30"
                                            value={providers[AIProvider.COHERE].apiKey || ''}
                                            onChange={(e) => updateProviderKey(AIProvider.COHERE, e.target.value)}
                                        />
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${providers[AIProvider.COHERE].apiKey ? 'text-green-400 bg-green-500/10' : 'text-hapf-muted bg-white/5'}`}>
                                            {providers[AIProvider.COHERE].apiKey ? 'PROD MODE' : 'SIMULATOR'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INTEGRATIONS TAB */}
                    {activeSettingsTab === 'integrations' && (
                        <div className="space-y-4">
                            <div className="border border-hapf-accent/30 rounded-lg p-4 bg-hapf-accent/5">
                                <div className="flex items-center gap-3 mb-4">
                                     <Workflow className="text-hapf-accent w-8 h-8"/>
                                     <div>
                                         <div className="font-bold text-sm">n8n (Self-Hosted)</div>
                                         <div className="text-xs text-hapf-muted">Configure compilation target for n8n workflows.</div>
                                     </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-hapf-muted uppercase mb-1">Instance URL</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://n8n.your-domain.com"
                                            className="w-full bg-black/40 border border-hapf-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-hapf-accent"
                                            value={n8nConfig.instanceUrl}
                                            onChange={(e) => setN8nConfig({...n8nConfig, instanceUrl: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-hapf-muted uppercase mb-1">API Key (Optional)</label>
                                        <input 
                                            type="password" 
                                            placeholder="n8n_api_key_..."
                                            className="w-full bg-black/40 border border-hapf-border rounded px-3 py-2 text-xs font-mono outline-none focus:border-hapf-accent"
                                            value={n8nConfig.apiKey}
                                            onChange={(e) => setN8nConfig({...n8nConfig, apiKey: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SYSTEM TAB */}
                    {activeSettingsTab === 'system' && (
                        <div className="space-y-4">
                            <div className="border border-hapf-success/30 rounded-lg p-4 bg-hapf-success/5">
                                <div className="flex items-center gap-3 mb-4">
                                     <Database className="text-hapf-success w-8 h-8"/>
                                     <div>
                                         <div className="font-bold text-sm">Examples Library</div>
                                         <div className="text-xs text-hapf-muted">Manage the built-in HAPF pipeline examples.</div>
                                     </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-hapf-text">Export all example code and inputs to JSON.</span>
                                    <button 
                                        onClick={handleExportLibrary}
                                        className="bg-hapf-success hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-colors"
                                    >
                                        <Download size={14} /> EXPORT LIBRARY
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
      )}

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
            <div className="flex items-center gap-2 mt-0.5">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <div className="text-[10px] text-hapf-muted uppercase tracking-wider font-bold flex gap-2">
                    <span className="text-blue-400">GEMINI</span>
                    {providers[AIProvider.MISTRAL].enabled && <span className="text-orange-400">MISTRAL</span>}
                    {providers[AIProvider.COHERE].enabled && <span className="text-teal-400">COHERE</span>}
                 </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 hover:bg-hapf-border rounded-full text-hapf-muted hover:text-white transition-colors"
                title="Model Registry & Integrations"
             >
                 <Settings size={18} />
             </button>

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
                        {Object.entries(PIPELINE_EXAMPLES).map(([key, example]: [string, any]) => (
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
                        <ArtifactViewer artifacts={artifacts} />
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
