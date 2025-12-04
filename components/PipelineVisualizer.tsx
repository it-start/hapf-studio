import React from 'react';
import { PipelineStatus } from '../types';
import { FileCode, Search, FileJson, Braces } from 'lucide-react';
import { motion } from 'framer-motion';

interface PipelineVisualizerProps {
  status: PipelineStatus;
}

const Node = ({ 
  icon: Icon, 
  label, 
  isActive, 
  isCompleted, 
  isError 
}: { 
  icon: any, 
  label: string, 
  isActive: boolean, 
  isCompleted: boolean, 
  isError: boolean 
}) => {
  return (
    <div className="flex flex-col items-center gap-2 relative z-10">
      <motion.div 
        initial={false}
        animate={{
          scale: isActive ? 1.1 : 1,
          boxShadow: isActive ? "0 0 20px rgba(59, 130, 246, 0.5)" : "0 0 0px rgba(0,0,0,0)",
          borderColor: isError ? '#ef4444' : isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#27272a'
        }}
        transition={{ duration: 0.3 }}
        className={`w-16 h-16 rounded-xl flex items-center justify-center bg-hapf-panel border-2 ${
          isCompleted ? 'text-hapf-success' : isActive ? 'text-hapf-primary' : 'text-hapf-muted'
        }`}
      >
        <Icon className="w-8 h-8" />
        {isActive && (
           <span className="absolute -top-1 -right-1 w-3 h-3 bg-hapf-primary rounded-full animate-ping" />
        )}
      </motion.div>
      <span className={`text-xs font-mono font-bold ${isActive ? 'text-hapf-primary' : 'text-hapf-muted'}`}>
        {label}
      </span>
    </div>
  );
};

const Connector = ({ active }: { active: boolean }) => (
  <div className="h-[2px] w-8 md:w-16 bg-hapf-border relative overflow-hidden">
    {active && (
      <motion.div 
        className="absolute top-0 left-0 h-full w-full bg-hapf-primary origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    )}
  </div>
);

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ status }) => {
  const getStatusState = (stepStatus: PipelineStatus) => {
    // Defines the order
    const order = [
      PipelineStatus.IDLE,
      PipelineStatus.INGESTING,
      PipelineStatus.ANALYZING,
      PipelineStatus.GENERATING,
      PipelineStatus.COMPLETE
    ];
    
    const currentIndex = order.indexOf(status);
    const stepIndex = order.indexOf(stepStatus);

    const isActive = status === stepStatus;
    const isCompleted = currentIndex > stepIndex || status === PipelineStatus.COMPLETE;
    const isError = status === PipelineStatus.FAILED && isActive;

    return { isActive, isCompleted, isError };
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-hapf-panel/30 border border-hapf-border rounded-lg relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'radial-gradient(#52525b 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }}>
      </div>

      <div className="flex items-center gap-2">
        {/* Step 1: Ingest */}
        <Node 
          icon={FileCode} 
          label="INGEST" 
          {...getStatusState(PipelineStatus.INGESTING)} 
        />
        <Connector active={status === PipelineStatus.INGESTING} />

        {/* Step 2: Analyze */}
        <Node 
          icon={Search} 
          label="ANALYZE" 
          {...getStatusState(PipelineStatus.ANALYZING)} 
        />
        <Connector active={status === PipelineStatus.ANALYZING} />

        {/* Step 3: Generate */}
        <Node 
          icon={Braces} 
          label="GEN SPEC" 
          {...getStatusState(PipelineStatus.GENERATING)} 
        />
      </div>
    </div>
  );
};

export default PipelineVisualizer;