import React, { useState } from 'react';
import { Artifacts } from '../types';
import { FileText, Box, Image as ImageIcon, ChevronRight, ChevronDown, Table, Sparkles, Cpu, Package, HardDrive, FileCode, Download, Workflow, Share2 } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { motion } from 'framer-motion';

interface JsonNodeProps {
  name: string;
  value: any;
  level?: number;
}

// --- Sub-component: Interactive JSON Tree ---
const JsonNode: React.FC<JsonNodeProps> = ({ name, value, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  
  if (!isObject) {
    let displayValue = JSON.stringify(value);
    let color = 'text-hapf-text';
    if (typeof value === 'string') {
        displayValue = `"${value}"`;
        color = 'text-green-400';
    } else if (typeof value === 'number') {
        color = 'text-orange-400';
    } else if (typeof value === 'boolean') {
        color = 'text-blue-400';
    }

    return (
      <div className="flex items-start gap-2 hover:bg-white/5 px-2 rounded font-mono text-xs">
         <span className="text-hapf-muted select-none opacity-70">{name}:</span>
         <span className={`break-all ${color}`}>{displayValue}</span>
      </div>
    );
  }

  return (
    <div className="font-mono text-xs my-0.5">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 rounded select-none py-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} className="text-hapf-muted"/> : <ChevronRight size={12} className="text-hapf-muted"/>}
        <span className="text-hapf-accent font-bold">{name}</span>
        <span className="text-hapf-muted text-[10px] opacity-60">{isArray ? `Array[${value.length}]` : '{...}'}</span>
      </div>
      
      {expanded && (
        <div className="pl-4 border-l border-hapf-border/30 ml-2">
            {Object.entries(value).map(([key, val]) => (
                <JsonNode key={key} name={key} value={val} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
};

// --- Sub-component: Quantum/Ether Art Renderer ---
const QuantumArtRenderer = ({ data }: { data: any }) => {
    // Check if data matches QuantumField structure
    const particles = data.particles || data.ether_field || [];
    if (!Array.isArray(particles) || particles.length === 0) return null;
    
    // Safety check: Needs x/y or similar
    if (!particles[0].hasOwnProperty('x')) return null;

    return (
        <div className="mt-4 mb-6 relative">
             <div className="flex items-center justify-between mb-2">
                 <div className="text-xs text-hapf-accent flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Sparkles size={14} className="animate-pulse"/> Quantum Ether Field
                 </div>
                 <div className="text-[10px] text-hapf-muted font-mono">
                     Coherence: {(data.coherence * 100).toFixed(1)}% | Entropy: {data.entropy || 0}
                 </div>
             </div>
             
             {/* Visualization Container */}
             <div className="w-full h-80 bg-black border border-hapf-accent/30 rounded-xl relative overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.1)]">
                 {/* Grid Background */}
                 <div className="absolute inset-0 opacity-20" style={{ 
                      backgroundImage: 'radial-gradient(#8b5cf6 1px, transparent 1px)', 
                      backgroundSize: '20px 20px' 
                 }}></div>

                 {/* Particles */}
                 {particles.map((p: any, i: number) => {
                     const size = p.size || Math.random() * 10 + 5;
                     const color = p.color || '#8b5cf6';
                     return (
                         <motion.div
                            key={i}
                            initial={{ 
                                x: `${p.x}%`, 
                                y: `${p.y}%`, 
                                scale: 0,
                                opacity: 0 
                            }}
                            animate={{ 
                                x: [`${p.x}%`, `${p.x + (Math.random() * 10 - 5)}%`, `${p.x}%`],
                                y: [`${p.y}%`, `${p.y + (Math.random() * 10 - 5)}%`, `${p.y}%`],
                                scale: [1, 1.2, 1],
                                opacity: [p.energy || 0.7, 1, p.energy || 0.7]
                            }}
                            transition={{ 
                                duration: Math.random() * 3 + 2, 
                                repeat: Infinity,
                                ease: "easeInOut" 
                            }}
                            className="absolute rounded-full blur-[1px]"
                            style={{
                                width: size,
                                height: size,
                                backgroundColor: color,
                                boxShadow: `0 0 ${size * 2}px ${color}`
                            }}
                         />
                     );
                 })}
                 
                 {/* Connecting Lines (Simulated Ether) */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    {particles.slice(0, 10).map((p1: any, i: number) => 
                        particles.slice(i + 1, i + 3).map((p2: any, j: number) => (
                            <motion.line
                                key={`${i}-${j}`}
                                x1={`${p1.x}%`}
                                y1={`${p1.y}%`}
                                x2={`${p2.x}%`}
                                y2={`${p2.y}%`}
                                stroke={p1.color || '#8b5cf6'}
                                strokeWidth="1"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.5 }}
                                transition={{ duration: 2, delay: 1 }}
                            />
                        ))
                    )}
                 </svg>
             </div>
             
             <div className="mt-2 text-[10px] text-hapf-muted text-center font-mono">
                 Rendered via HAPF Ether Engine v0.1
             </div>
        </div>
    );
}

// --- Sub-component: Bundle Explorer (Project Teleport) ---
const BundleExplorer = ({ data }: { data: any }) => {
    // Check if this is a HapfBundle
    if (!data || !data.manifest || !data.source_origin) return null;

    const handleDownload = () => {
        const filename = `bundle-${data.id || 'snapshot'}.hapf`;
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                 <div className="text-xs text-hapf-primary flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Package size={14} /> HAPF Project Bundle
                 </div>
                 <div className="text-[10px] text-hapf-muted font-mono bg-hapf-panel border border-hapf-border px-2 py-1 rounded">
                     Ratio: {(data.compression_ratio * 100).toFixed(0)}%
                 </div>
             </div>

             <div className="bg-hapf-panel border border-hapf-border rounded-xl overflow-hidden">
                 <div className="bg-black/30 px-4 py-3 border-b border-hapf-border flex items-center gap-3">
                     <div className="w-10 h-10 bg-hapf-primary/10 rounded flex items-center justify-center text-hapf-primary">
                         <HardDrive size={20} />
                     </div>
                     <div>
                         <div className="text-sm font-bold text-hapf-text">{data.source_origin}</div>
                         <div className="text-xs text-hapf-muted flex gap-2">
                             <span>ID: {data.id}</span>
                             <span>•</span>
                             <span>{data.total_files} Files</span>
                         </div>
                     </div>
                 </div>
                 
                 <div className="max-h-60 overflow-y-auto">
                     <table className="w-full text-left border-collapse">
                         <thead className="bg-black/20 text-[10px] uppercase text-hapf-muted sticky top-0 backdrop-blur-sm">
                             <tr>
                                 <th className="py-2 px-4 font-normal">File Path</th>
                                 <th className="py-2 px-4 font-normal">Hash</th>
                                 <th className="py-2 px-4 font-normal">Size</th>
                             </tr>
                         </thead>
                         <tbody className="text-xs font-mono">
                             {data.manifest.map((file: any, i: number) => (
                                 <tr key={i} className="border-b border-hapf-border/10 hover:bg-white/5 transition-colors">
                                     <td className="py-2 px-4 text-hapf-text flex items-center gap-2">
                                         <FileCode size={12} className="text-hapf-muted"/>
                                         {file.path}
                                     </td>
                                     <td className="py-2 px-4 text-hapf-muted opacity-50 font-mono text-[10px]">{file.hash ? file.hash.substring(0, 8) + '...' : '-'}</td>
                                     <td className="py-2 px-4 text-hapf-muted">{(Math.random() * 10 + 1).toFixed(1)} KB</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
                 <div className="bg-hapf-primary/10 border-t border-hapf-primary/20 p-2 text-center">
                     <button 
                        onClick={handleDownload}
                        className="text-xs font-bold text-hapf-primary hover:text-white transition-colors flex items-center justify-center gap-2 w-full py-1"
                     >
                         <Download size={12} />
                         DOWNLOAD BUNDLE (.hapf)
                     </button>
                 </div>
             </div>
        </div>
    );
};

// --- Sub-component: N8n Workflow Viewer ---
const N8nWorkflowViewer = ({ data }: { data: any }) => {
    if (!data || !data.nodes) return null;

    const handleDownload = () => {
        const filename = `workflow-${data.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-hapf-panel border border-hapf-accent/30 rounded-xl overflow-hidden shadow-xl shadow-black/20">
           <div className="bg-gradient-to-r from-hapf-accent/10 to-transparent px-5 py-3 border-b border-hapf-accent/20 flex justify-between items-center">
               <h3 className="text-hapf-accent font-bold flex items-center gap-2">
                   <Workflow size={16}/> Generated n8n Workflow
               </h3>
               <span className="text-[10px] bg-hapf-accent/10 px-2 py-0.5 rounded border border-hapf-accent/20 font-bold">
                   {data.nodes.length} Nodes
               </span>
           </div>
           
           <div className="p-5">
               <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-[#ff6d5a]/20 rounded-lg flex items-center justify-center">
                       <Workflow size={24} className="text-[#ff6d5a]" />
                   </div>
                   <div>
                       <div className="font-bold text-sm text-hapf-text">Workflow Ready for Import</div>
                       <p className="text-xs text-hapf-muted">This JSON file can be imported directly into your n8n instance.</p>
                   </div>
                   <button 
                        onClick={handleDownload}
                        className="ml-auto bg-[#ff6d5a] hover:bg-[#e05e4d] text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-[#ff6d5a]/20"
                   >
                       <Download size={14} /> DOWNLOAD JSON
                   </button>
               </div>

               {/* Node List Preview */}
               <div className="bg-black/30 rounded-lg border border-hapf-border overflow-hidden">
                   <div className="px-4 py-2 text-[10px] text-hapf-muted uppercase font-bold border-b border-hapf-border">Node Map</div>
                   <div className="divide-y divide-hapf-border/30">
                       {data.nodes.map((node: any, i: number) => (
                           <div key={i} className="px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors">
                               <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${node.type.includes('webhook') ? 'bg-green-500' : 'bg-blue-500'}`} />
                                   <span className="text-xs font-mono text-hapf-text">{node.name}</span>
                               </div>
                               <span className="text-[10px] text-hapf-muted font-mono">{node.type}</span>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
        </div>
    );
};

// --- Sub-component: Smart Value Renderer ---
const SmartValueRenderer = ({ name, value }: { name: string, value: any }) => {
    // 0. Quantum/Ether Art Check
    if (value && typeof value === 'object' && (value.particles || value.ether_field)) {
        return <QuantumArtRenderer data={value} />;
    }

    // 0.5 Bundle Check
    if (value && typeof value === 'object' && value.manifest && value.source_origin) {
        return <BundleExplorer data={value} />;
    }

    // 1. Image Check (URL or Data URI)
    if (typeof value === 'string' && (value.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)$/i) || value.startsWith('data:image'))) {
        return (
            <div className="mt-2 mb-4">
                <div className="text-xs text-hapf-muted mb-2 flex items-center gap-2 uppercase tracking-wider font-bold">
                    <ImageIcon size={12}/> {name} Preview
                </div>
                <div className="border border-hapf-border bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#121214] p-2 rounded-lg inline-block">
                    <img src={value} alt={name} className="max-w-full h-auto max-h-64 rounded shadow-lg" />
                </div>
            </div>
        );
    }
    
    // 2. Markdown/Long Text Check (Heuristic: contains newlines or specific keywords)
    if (typeof value === 'string' && (value.includes('\n') || value.length > 150)) {
         return (
             <div className="mt-2 mb-4 w-full">
                <div className="text-xs text-hapf-muted mb-2 flex items-center gap-2 uppercase tracking-wider font-bold">
                    <FileText size={12}/> {name}
                </div>
                <div className="bg-black/50 border border-hapf-border rounded-lg p-4 text-sm text-hapf-text font-mono overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {value}
                </div>
             </div>
         );
    }

    // 3. Fallback to JSON Tree for objects or simple key-value
    return <JsonNode name={name} value={value} />;
};

const ArtifactViewer: React.FC<{ artifacts: Artifacts }> = ({ artifacts }) => {
  const hasContent = artifacts.files || artifacts.spec || artifacts.genericOutput || artifacts.n8n_workflow;

  if (!hasContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-hapf-muted opacity-40 select-none">
            <Box size={64} strokeWidth={0.5} />
            <p className="mt-4 text-sm font-mono">No artifacts generated.</p>
            <p className="text-xs">Run a pipeline to generate outputs.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8 p-6 font-mono text-sm pb-20">
      
      {/* 0. N8n Workflow Viewer */}
      {artifacts.n8n_workflow && (
          <N8nWorkflowViewer data={artifacts.n8n_workflow} />
      )}

      {/* 1. HAPF Spec (Reverse Engineering) */}
      {artifacts.spec && (
        <div className="bg-hapf-panel border border-hapf-success/30 rounded-xl overflow-hidden shadow-xl shadow-black/20">
           <div className="bg-gradient-to-r from-hapf-success/10 to-transparent px-5 py-3 border-b border-hapf-success/20 flex justify-between items-center">
               <h3 className="text-hapf-success font-bold flex items-center gap-2">
                   <FileText size={16}/> Generated HAPF Spec
               </h3>
               <span className="text-[10px] text-hapf-success bg-hapf-success/10 px-2 py-0.5 rounded border border-hapf-success/20 font-bold">v1.0.0</span>
           </div>
           
           <div className="p-5 bg-hapf-panel/50">
               <p className="text-hapf-muted text-xs mb-4 italic pl-1 border-l-2 border-hapf-success/30">{artifacts.spec.description}</p>
               <div className="bg-[#09090b] rounded-lg border border-hapf-border max-h-[400px] overflow-auto shadow-inner">
                   <CodeBlock code={artifacts.spec.hapf_code} />
               </div>
           </div>
        </div>
      )}

      {/* 2. Generic Output (Reports, JSON, Images, Quantum Arts) */}
      {artifacts.genericOutput && (
          <div className="bg-hapf-panel border border-hapf-primary/30 rounded-xl overflow-hidden shadow-xl shadow-black/20">
              <div className="bg-gradient-to-r from-hapf-primary/10 to-transparent px-5 py-3 border-b border-hapf-primary/20 flex justify-between items-center">
                  <h3 className="text-hapf-primary font-bold flex items-center gap-2">
                      <Box size={16}/> Pipeline Output
                  </h3>
              </div>
              <div className="p-5 space-y-6">
                  {/* If output is a simple object, iterate keys smart-ly */}
                  {typeof artifacts.genericOutput === 'object' && !Array.isArray(artifacts.genericOutput) && artifacts.genericOutput !== null ? (
                      Object.entries(artifacts.genericOutput).map(([key, value]) => (
                          <div key={key} className="border-b border-hapf-border/30 last:border-0 pb-6 last:pb-0">
                              <SmartValueRenderer name={key} value={value} />
                          </div>
                      ))
                  ) : (
                      <SmartValueRenderer name="Result" value={artifacts.genericOutput} />
                  )}
              </div>
          </div>
      )}

      {/* 3. Ingested Files Table */}
      {artifacts.files && (
        <div className="bg-hapf-panel border border-hapf-accent/30 rounded-xl overflow-hidden shadow-xl shadow-black/20">
           <div className="bg-gradient-to-r from-hapf-accent/10 to-transparent px-5 py-3 border-b border-hapf-accent/20">
               <h3 className="text-hapf-accent font-bold flex items-center gap-2">
                   <Table size={16}/> Ingested Virtual Files
               </h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-black/20 text-xs uppercase tracking-wider">
                      <tr className="text-hapf-muted border-b border-hapf-border/50">
                          <th className="py-3 px-5 font-semibold">Path</th>
                          <th className="py-3 px-5 font-semibold">Intent</th>
                          <th className="py-3 px-5 font-semibold">Content Hint</th>
                      </tr>
                  </thead>
                  <tbody>
                      {artifacts.files.map((file, idx) => (
                          <tr key={idx} className="border-b border-hapf-border/30 hover:bg-white/5 transition-colors group">
                              <td className="py-3 px-5 text-hapf-text font-medium font-mono text-xs">{file.path}</td>
                              <td className="py-3 px-5">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-hapf-accent/10 text-hapf-accent border border-hapf-accent/20 font-bold">
                                      {file.intent}
                                  </span>
                              </td>
                              <td className="py-3 px-5 text-hapf-muted truncate max-w-[200px] group-hover:text-hapf-text transition-colors opacity-70">
                                  {file.content_hint}
                              </td>
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

export default ArtifactViewer;