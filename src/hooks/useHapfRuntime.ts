
import { useState, useCallback } from 'react';
import { 
  PipelineStatus, 
  LogEntry, 
  LogLevel, 
  Artifacts, 
  RunMetrics, 
  SimulationStep, 
  AIProvider, 
  GithubConfig, 
  ProviderConfig, 
  N8nConfig 
} from '../types';
import * as geminiService from '../services/geminiService';
import * as githubService from '../services/githubService';

// Helper for unique IDs
const uid = () => Math.random().toString(36).substr(2, 9);

export interface RuntimeConfig {
  useGithub: boolean;
  github: GithubConfig;
  providers: Record<AIProvider, ProviderConfig>;
  n8n: N8nConfig;
  selectedExampleKey: string;
}

export const useHapfRuntime = () => {
  // --- State ---
  const [status, setStatus] = useState<PipelineStatus>(PipelineStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>({ 
    files: null, 
    architecture: null, 
    spec: null,
    genericOutput: null,
    n8n_workflow: null
  });
  const [metrics, setMetrics] = useState<RunMetrics | null>(null);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);

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

  // --- Reset ---
  const reset = useCallback(() => {
    setStatus(PipelineStatus.IDLE);
    setLogs([]);
    setArtifacts({ files: null, architecture: null, spec: null, genericOutput: null, n8n_workflow: null });
    setMetrics(null);
    setSteps([]);
    setActiveModule(null);
  }, []);

  // --- Execution Engine ---
  const executePipeline = useCallback(async (
    code: string, 
    input: string, 
    config: RuntimeConfig,
    callbacks: { onVisualizerFocus: () => void }
  ) => {
    if (status !== PipelineStatus.IDLE && status !== PipelineStatus.COMPLETE && status !== PipelineStatus.FAILED) return;
    
    // 1. Prepare Environment
    reset();
    callbacks.onVisualizerFocus();
    
    addLog("Initializing HAPF Runtime v1.0...", LogLevel.SYSTEM);
    
    // Log Active Providers
    const activeProviders = Object.values(config.providers)
      .filter(p => p.enabled)
      .map(p => `${p.provider}${p.apiKey ? ' (PROD)' : ' (SIM)'}`);
    addLog(`Active Model Registry: ${activeProviders.join(', ')}`, LogLevel.SYSTEM);

    try {
      setStatus(PipelineStatus.INGESTING);
      let runtimeInput = input;

      // 2. Ingestion Phase (GitHub or Raw JSON)
      if (config.useGithub && config.github.repoUrl) {
         try {
             addLog(`Connecting to GitHub: ${config.github.repoUrl}...`, LogLevel.INFO, "GITHUB_CONNECTOR");
             const files = await githubService.fetchGithubRepo(
                 config.github.repoUrl, 
                 config.github.token, 
                 (msg) => addLog(msg, LogLevel.INFO, "GITHUB_API")
             );
             addLog(`Fetched ${files.length} files from repository.`, LogLevel.SUCCESS, "INGEST");
             
             // Inject GitHub data as the input for the simulation
             runtimeInput = JSON.stringify({
                 repo_path: config.github.repoUrl,
                 files: files.map(f => ({ path: f.path, content_preview: f.content_hint }))
             }, null, 2);
             
             setArtifacts(prev => ({ ...prev, files }));
         } catch (e: any) {
             throw new Error(`GitHub Error: ${e.message}`);
         }
      }

      // 3. Simulation Phase (Gemini)
      setStatus(PipelineStatus.ANALYZING);
      addLog("Starting Multi-Model Pipeline Execution...", LogLevel.SYSTEM);
      
      const startTime = performance.now();
      const result = await geminiService.runGenericPipelineSimulation(code, runtimeInput, config.providers);
      const endTime = performance.now();

      // 4. Telemetry
      const latency = Math.round(endTime - startTime);
      const promptTokens = result.usage?.promptTokenCount || 0;
      const completionTokens = result.usage?.candidatesTokenCount || 0;
      const totalTokens = result.usage?.totalTokenCount || 0;
      
      const cost = ((promptTokens * 0.075) + (completionTokens * 0.30)) / 1000000;
      
      setMetrics({
          totalLatencyMs: latency,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: cost
      });

      setSteps(result.steps || []);

      // 5. Execution Replay (Visuals)
      setStatus(PipelineStatus.GENERATING); 

      const stepsToReplay = result.steps || [];
      
      for (const step of stepsToReplay) {
          // Highlight module in Visualizer
          setActiveModule(step.module);
          
          // Determine Provider (Heuristic)
          let stepProvider = AIProvider.GOOGLE; 
          if (step.message.toLowerCase().includes('mistral') || code.includes(`module "${step.module}"`) && code.includes('mistral')) {
              stepProvider = AIProvider.MISTRAL;
          } else if (step.message.toLowerCase().includes('cohere') || code.includes(`module "${step.module}"`) && code.includes('cohere')) {
              stepProvider = AIProvider.COHERE;
          }

          // Add Log
          const preview = step.data_preview ? ` [Data: ${step.data_preview}]` : '';
          addLog(`${step.message}${preview}`, LogLevel.INFO, step.module, stepProvider);
          
          // Delay for visual effect
          await new Promise(r => setTimeout(r, 800));
      }
      
      setActiveModule(null);
      setArtifacts(prev => ({ ...prev, genericOutput: result.output }));
      
      // 6. Post-Processing (Compilers)
      if (config.selectedExampleKey === 'n8n-integration') {
          addLog("Compiling pipeline to n8n Workflow...", LogLevel.SYSTEM, "COMPILER");
          const n8nWorkflow = await geminiService.runCompileToN8n(code, config.n8n.instanceUrl);
          setArtifacts(prev => ({ ...prev, n8n_workflow: n8nWorkflow }));
          addLog("Compilation complete! n8n JSON generated.", LogLevel.SUCCESS, "COMPILER");
      }

      addLog("Execution completed successfully.", LogLevel.SUCCESS, "SYSTEM");
      setStatus(PipelineStatus.COMPLETE);

    } catch (error: any) {
      console.error(error);
      addLog(`Pipeline crashed: ${error.message || "Unknown error"}`, LogLevel.ERROR, "SYSTEM");
      setStatus(PipelineStatus.FAILED);
    }
  }, [status, addLog, reset]);

  return {
    status,
    logs,
    artifacts,
    metrics,
    steps,
    activeModule,
    executePipeline,
    resetRuntime: reset,
    addLog
  };
};
