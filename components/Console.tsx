import React, { useEffect, useRef } from 'react';
import { LogEntry, LogLevel, AIProvider } from '../types';
import { Terminal, CheckCircle2, AlertCircle, Info, Hash, BrainCircuit, Cloud, Wind, Hexagon } from 'lucide-react';

interface ConsoleProps {
  logs: LogEntry[];
}

const LogIcon = ({ level, isThought }: { level: LogLevel, isThought: boolean }) => {
  if (isThought) return <BrainCircuit className="w-3 h-3 text-hapf-muted/70 mt-0.5" />;
  
  switch (level) {
    case LogLevel.SUCCESS: return <CheckCircle2 className="w-3 h-3 text-hapf-success mt-0.5" />;
    case LogLevel.ERROR: return <AlertCircle className="w-3 h-3 text-hapf-error mt-0.5" />;
    case LogLevel.WARN: return <AlertCircle className="w-3 h-3 text-hapf-warning mt-0.5" />;
    case LogLevel.SYSTEM: return <Hash className="w-3 h-3 text-hapf-accent mt-0.5" />;
    default: return <Info className="w-3 h-3 text-hapf-primary mt-0.5" />;
  }
};

const ProviderBadge = ({ provider }: { provider?: AIProvider }) => {
    if (!provider || provider === AIProvider.UNKNOWN) return null;
    
    let colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    let icon = <Cloud size={8} />;
    let label = "GEMINI";

    if (provider === AIProvider.MISTRAL) {
        colorClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
        icon = <Wind size={8} />;
        label = "MISTRAL";
    } else if (provider === AIProvider.COHERE) {
        colorClass = "bg-teal-500/10 text-teal-400 border-teal-500/20";
        icon = <Hexagon size={8} />;
        label = "COHERE";
    }

    return (
        <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${colorClass} font-bold mr-2`}>
            {icon} {label}
        </span>
    );
};

const Console: React.FC<ConsoleProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black border border-hapf-border rounded-md overflow-hidden font-mono text-xs">
      <div className="bg-hapf-panel px-3 py-2 border-b border-hapf-border flex items-center gap-2">
        <Terminal className="w-4 h-4 text-hapf-muted" />
        <span className="font-semibold text-hapf-muted">RUNTIME LOGS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-black/50">
        {logs.length === 0 && (
          <div className="text-hapf-muted italic opacity-50">Waiting for execution...</div>
        )}
        {logs.map((log) => {
          const isThought = log.message.includes('[THOUGHT]');
          const displayMessage = log.message.replace('[THOUGHT]', '').trim();
          
          return (
            <div key={log.id} className={`flex gap-3 group hover:bg-white/5 p-1 rounded transition-colors ${isThought ? 'opacity-70' : ''}`}>
              <span className="text-hapf-muted opacity-50 select-none w-16 shrink-0">{log.timestamp}</span>
              <div className="shrink-0 pt-0.5">
                 <LogIcon level={log.level} isThought={isThought} />
              </div>
              <div className="flex flex-col gap-1 w-full min-w-0">
                  <div className="flex items-center">
                    {log.module && (
                        <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] h-fit mr-2 ${isThought ? 'bg-white/5 text-hapf-muted' : 'bg-hapf-accent/10 text-hapf-accent'}`}>
                        {log.module}
                        </span>
                    )}
                    {log.provider && !isThought && <ProviderBadge provider={log.provider} />}
                  </div>
                  <span className={`break-all ${
                    isThought ? 'text-hapf-muted italic' :
                    log.level === LogLevel.ERROR ? 'text-hapf-error' : 
                    log.level === LogLevel.SUCCESS ? 'text-hapf-success' : 
                    'text-hapf-text'
                  }`}>
                    {displayMessage}
                  </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Console;