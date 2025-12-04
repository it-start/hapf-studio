import React, { useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';
import { Terminal, CheckCircle2, AlertCircle, Info, Hash } from 'lucide-react';

interface ConsoleProps {
  logs: LogEntry[];
}

const LogIcon = ({ level }: { level: LogLevel }) => {
  switch (level) {
    case LogLevel.SUCCESS: return <CheckCircle2 className="w-3 h-3 text-hapf-success mt-0.5" />;
    case LogLevel.ERROR: return <AlertCircle className="w-3 h-3 text-hapf-error mt-0.5" />;
    case LogLevel.WARN: return <AlertCircle className="w-3 h-3 text-hapf-warning mt-0.5" />;
    case LogLevel.SYSTEM: return <Hash className="w-3 h-3 text-hapf-accent mt-0.5" />;
    default: return <Info className="w-3 h-3 text-hapf-primary mt-0.5" />;
  }
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
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 group hover:bg-white/5 p-1 rounded transition-colors">
            <span className="text-hapf-muted opacity-50 select-none w-16 shrink-0">{log.timestamp}</span>
            <div className="shrink-0 pt-0.5">
               <LogIcon level={log.level} />
            </div>
            {log.module && (
               <span className="text-hapf-accent shrink-0 font-bold px-1.5 py-0.5 bg-hapf-accent/10 rounded text-[10px] h-fit">
                 {log.module}
               </span>
            )}
            <span className={`break-all ${
              log.level === LogLevel.ERROR ? 'text-hapf-error' : 
              log.level === LogLevel.SUCCESS ? 'text-hapf-success' : 
              'text-hapf-text'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Console;
