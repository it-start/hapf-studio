
import React, { useState } from 'react';
import { 
  Play, 
  Code2, 
  Activity,
  FileJson,
  ChevronDown,
  GitGraph,
  Github,
  Zap,
} from 'lucide-react';
import { 
  PipelineStatus, 
  GithubConfig,
  ProviderConfig,
  AIProvider,
  N8nConfig
} from './types';
import { PIPELINE_EXAMPLES } from './examples';

// New Components
import Console from './components/Console';
import HapfDiagram from './components/HapfDiagram';
import HapfEditor from './components/HapfEditor';
import ArtifactViewer from './components/ArtifactViewer';
import SettingsModal from './components/modals/SettingsModal';
import GithubConnectModal from './components/modals/GithubConnectModal';
import Header from './components/Header';

// New Hook
import { useHapfRuntime } from './hooks/useHapfRuntime';

import { BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar } from 'recharts';

function App() {
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'visual' | 'diagram' | 'artifacts' | 'metrics'>('visual');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);

  // --- Configuration State ---
  const [selectedExampleKey, setSelectedExampleKey] = useState<string>("reverse-engineer");
  const [editorCode, setEditorCode] = useState(PIPELINE_EXAMPLES["reverse-engineer"].code);
  const [inputText, setInputText] = useState(PIPELINE_EXAMPLES["reverse-engineer"].input);
  
  const [useGithub, setUseGithub] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ repoUrl: '', token: '' });
  const [n8nConfig, setN8nConfig] = useState<N8nConfig>({ instanceUrl: 'https://your-n8n.com', apiKey: '' });
  
  const [providers, setProviders] = useState<Record<AIProvider, ProviderConfig>>({
    [AIProvider.GOOGLE]: { provider: AIProvider.GOOGLE, enabled: true, defaultModel: 'gemini-2.5-flash', apiKey: 'env-var-managed' },
    [AIProvider.MISTRAL]: { provider: AIProvider.MISTRAL, enabled: false, defaultModel: 'mistral-large', apiKey: '' },
    [AIProvider.COHERE]: { provider: AIProvider.COHERE, enabled: false, defaultModel: 'command-r-plus', apiKey: '' },
    [AIProvider.UNKNOWN]: { provider: AIProvider.UNKNOWN, enabled: false, defaultModel: '' }
  });

  // --- Runtime Hook ---
  const { 
    status, 
    logs, 
    artifacts, 
    metrics: runMetrics, 
    steps: stepsForMetrics, 
    activeModule, 
    executePipeline, 
    resetRuntime,
    addLog
  } = useHapfRuntime();

  // --- Handlers ---

  const handleExampleChange = (key: string) => {
    if (PIPELINE_EXAMPLES[key]) {
      setSelectedExampleKey(key);
      setEditorCode(PIPELINE_EXAMPLES[key].code);
      setInputText(PIPELINE_EXAMPLES[key].input);
      resetRuntime();
    }
  };

  const handleRun = () => {
    executePipeline(
      editorCode,
      inputText,
      {
        useGithub,
        github: githubConfig,
        providers,
        n8n: n8nConfig,
        selectedExampleKey
      },
      {
        onVisualizerFocus: () => setActiveTab('visual')
      }
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

     const chartData = stepsForMetrics.map(step => ({
         name: step.module.replace('mod-', '').replace('runtime.', '').split('.').pop(),
         complexity: step.message.length + (step.data_preview?.length || 0),
         fullModule: step.module
     }));

     return (
        <div className="p-4 h-full flex flex-col overflow-y-auto">
            <h3 className="text-hapf-text font-bold mb-4 flex items-center gap-2">
                <Activity size={16}/> Runtime Telemetry
                <span className="text-[10px] bg-hapf-primary/10 text-hapf-primary px-2 py-0.5 rounded border border-hapf-primary/20">LIVE DATA</span>
            </h3>
            
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

  const isRunDisabled = status !== PipelineStatus.IDLE && status !== PipelineStatus.COMPLETE && status !== PipelineStatus.FAILED;

  return (
    <div className="flex flex-col h-screen bg-hapf-bg text-hapf-text font-sans overflow-hidden">
      
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        providers={providers}
        toggleProvider={toggleProvider}
        updateProviderKey={updateProviderKey}
        n8nConfig={n8nConfig}
        setN8nConfig={setN8nConfig}
        onLog={addLog}
      />

      <GithubConnectModal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
        config={githubConfig}
        setConfig={setGithubConfig}
        onConnect={() => setUseGithub(true)}
        onDisconnect={() => { setUseGithub(false); setGithubConfig({ repoUrl: '', token: '' }); }}
      />

      <Header 
        providers={providers}
        useGithub={useGithub}
        pipelineStatus={status}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenGithub={() => setShowGithubModal(true)}
        onRun={handleRun}
        onReset={resetRuntime}
        isRunDisabled={isRunDisabled}
      />

      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Editor & Input */}
        <div className="w-1/2 flex flex-col border-r border-hapf-border">
            <div className="flex-1 flex flex-col min-h-0">
                <div className="h-10 bg-hapf-panel border-b border-hapf-border flex items-center px-4 gap-2 text-xs font-mono text-hapf-muted justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3 h-3"/>
                      <span>SOURCE:</span>
                    </div>
                    
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

            <div className="flex-1 overflow-auto relative bg-[#09090b]">
                 {activeTab === 'visual' && (
                     <div className="h-full flex flex-col">
                        <div className="h-1/2 min-h-[250px] border-b border-hapf-border relative">
                            <HapfDiagram code={editorCode} activeModule={activeModule} />
                            
                            {status === PipelineStatus.IDLE && (
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
            
            <div className="h-6 bg-hapf-primary/10 border-t border-hapf-primary/20 flex items-center px-4 text-[10px] font-mono text-hapf-primary justify-between">
                <span>STATUS: {status}</span>
                <span>SOURCE: {useGithub ? 'LIVE GITHUB API' : 'VIRTUAL MOCK'}</span>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;
