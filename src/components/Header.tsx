
import React from 'react';
import { Settings, Github, Activity, Play, RotateCcw } from 'lucide-react';
import { AIProvider, ProviderConfig, PipelineStatus } from '../types';

interface HeaderProps {
  providers: Record<AIProvider, ProviderConfig>;
  useGithub: boolean;
  pipelineStatus: PipelineStatus;
  onOpenSettings: () => void;
  onOpenGithub: () => void;
  onRun: () => void;
  onReset: () => void;
  isRunDisabled: boolean;
}

const Header: React.FC<HeaderProps> = ({
  providers, useGithub, pipelineStatus, onOpenSettings, onOpenGithub, onRun, onReset, isRunDisabled
}) => {
  return (
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
              onClick={onOpenSettings}
              className="p-2 hover:bg-hapf-border rounded-full text-hapf-muted hover:text-white transition-colors"
              title="Model Registry & Integrations"
           >
               <Settings size={18} />
           </button>

           <button 
              onClick={onOpenGithub}
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
                onClick={onRun}
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
                  onClick={onReset}
                  className="p-1.5 hover:bg-hapf-border rounded text-hapf-muted hover:text-white transition-colors"
                  title="Reset Runtime"
              >
                  <RotateCcw className="w-3 h-3" />
              </button>
           </div>
      </div>
    </header>
  );
};

export default Header;
