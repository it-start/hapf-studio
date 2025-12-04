import React, { useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  BackgroundVariant
} from 'reactflow';
import { Layers, Box, FileInput, MonitorPlay } from 'lucide-react';

interface HapfDiagramProps {
  code: string;
}

// Custom Node Styling
const nodeStyle = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: '8px',
  color: '#e4e4e7',
  padding: '10px',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
  minWidth: '150px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const inputNodeStyle = {
  ...nodeStyle,
  borderColor: '#8b5cf6', // Accent color for Inputs
  borderStyle: 'dashed',
};

const moduleNodeStyle = {
  ...nodeStyle,
  borderColor: '#3b82f6', // Primary color for Modules
};

const HapfDiagram: React.FC<HapfDiagramProps> = ({ code }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const parseHapf = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Track created nodes to avoid duplicates and help with linking
    const nodeMap = new Map<string, string>(); // name -> id
    const variableMap = new Map<string, string>(); // variableName -> sourceModuleId

    // 1. Identify Modules (Nodes)
    const moduleRegex = /module\s+"([^"]+)"/g;
    let match;
    let modIndex = 0;
    
    while ((match = moduleRegex.exec(code)) !== null) {
      const moduleName = match[1];
      const id = `mod-${moduleName}`;
      
      newNodes.push({
        id,
        position: { x: 0, y: 0 }, // Position calculated later
        data: { label: (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-hapf-primary font-bold border-b border-hapf-border pb-1 mb-1">
              <Box size={12} />
              MODULE
            </div>
            <div>{moduleName}</div>
          </div>
        )},
        style: moduleNodeStyle,
        type: 'default',
      });
      nodeMap.set(moduleName, id);
      modIndex++;
    }

    // 2. Identify Pipeline Flows (Edges)
    const pipelineRegex = /pipeline\s+"([^"]+)"\s*\{([\s\S]*?)\}/g;
    let pipeMatch;

    while ((pipeMatch = pipelineRegex.exec(code)) !== null) {
        const pipelineContent = pipeMatch[2];

        // 2a. Strategy: Functional Syntax parsing (robust for multiline args)
        // Look for pattern `let <var> = run <module>(`
        const runStartRegex = /let\s+(\w+)\s*=\s*run\s+([\w\.]+)\s*\(/g;
        let runMatch;
        while ((runMatch = runStartRegex.exec(pipelineContent)) !== null) {
            const [_, outputVar, moduleName] = runMatch;
            const moduleId = nodeMap.get(moduleName);
            
            if (moduleId) {
                variableMap.set(outputVar, moduleId);

                // Now extracting arguments is tricky with Regex due to nesting.
                // We'll approximate by looking at the content inside parens immediately following
                // Simple heuristic: find all variables referenced in the args
                const startIndex = runMatch.index + runMatch[0].length;
                // Find matching closing parenthesis?
                // For visualization, we just scan for variable names used previously
                const remainder = pipelineContent.substring(startIndex);
                // Extract text until closing ')' roughly (ignoring nested logic for now)
                // or just scan the next 100-200 chars for known variables.
                
                // Identify Inputs: Look for `input.<something>` or known `variableMap` keys
                const potentialVars = Array.from(variableMap.keys());
                
                // Find `input.X` usages
                const inputUsageRegex = /input\.(\w+)/g;
                let inputMatch;
                // Limit search scope to avoid false positives from later code
                const searchScope = remainder.split(')')[0] + remainder.split(')')[1]; // simplistic
                
                while ((inputMatch = inputUsageRegex.exec(searchScope)) !== null) {
                   const inputName = inputMatch[1];
                   const sourceId = `input-${inputName}`;
                   
                   if (!newNodes.find(n => n.id === sourceId)) {
                        newNodes.push({
                            id: sourceId,
                            position: { x: 0, y: 0 },
                            data: { label: (
                              <div className="flex items-center gap-2">
                                <FileInput size={12} className="text-hapf-accent"/>
                                input.{inputName}
                              </div>
                            ) },
                            style: inputNodeStyle,
                        });
                   }
                   // Create Edge
                   const edgeId = `e-${sourceId}-${moduleId}`;
                   if (!newEdges.find(e => e.id === edgeId)) {
                       newEdges.push({
                           id: edgeId,
                           source: sourceId,
                           target: moduleId,
                           animated: true,
                           style: { stroke: '#52525b' },
                           markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
                       });
                   }
                }

                // Find usages of previous variables (e.g. `stream` in `run classifier(stream)`)
                potentialVars.forEach(v => {
                    // Check if variable 'v' appears in the args
                    // Simple check: regex boundary
                    const vRegex = new RegExp(`\\b${v}\\b`);
                    // We only want to check the arguments part of THIS run call.
                    // This is hard without full parsing. 
                    // Approximation: check if it appears between current index and next 'let' or 'run' or '}'
                    const nextKeyword = remainder.search(/\b(let|run|if|return)\b/);
                    const argsSegment = nextKeyword === -1 ? remainder : remainder.substring(0, nextKeyword);
                    
                    if (vRegex.test(argsSegment)) {
                        const sourceModId = variableMap.get(v);
                        if (sourceModId) {
                            const edgeId = `e-${sourceModId}-${moduleId}`;
                             if (!newEdges.find(e => e.id === edgeId)) {
                                newEdges.push({
                                    id: edgeId,
                                    source: sourceModId,
                                    target: moduleId,
                                    animated: true,
                                    style: { stroke: '#52525b' },
                                    markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
                                });
                             }
                        }
                    }
                });
            }
        }

        // 2b. Strategy: Arrow Syntax: step1 -> step2 -> step3
        const arrowSplitRegex = /([\w\.]+)\s*(?:→|->)\s*([\w\.]+)/g;
        let arrowMatch;
        while((arrowMatch = arrowSplitRegex.exec(pipelineContent)) !== null) {
            const sourceName = arrowMatch[1];
            const targetName = arrowMatch[2];
            
            let sourceId = nodeMap.get(sourceName);
            let targetId = nodeMap.get(targetName);

            // Infer Nodes
            if (!sourceId) {
                sourceId = `inferred-${sourceName}`;
                if (!newNodes.find(n => n.id === sourceId)) {
                    newNodes.push({
                        id: sourceId,
                        position: { x: 0, y: 0 },
                        data: { label: sourceName },
                        style: inputNodeStyle
                    });
                    nodeMap.set(sourceName, sourceId);
                }
            }
            if (!targetId) {
                targetId = `mod-${targetName}`; 
                if (!newNodes.find(n => n.id === targetId)) {
                    targetId = `inferred-${targetName}`;
                    newNodes.push({
                        id: targetId,
                        position: { x: 0, y: 0 },
                        data: { label: targetName },
                        style: moduleNodeStyle
                    });
                    nodeMap.set(targetName, targetId);
                }
            }

            const edgeId = `e-${sourceId}-${targetId}`;
            if (!newEdges.find(e => e.id === edgeId)) {
                newEdges.push({
                    id: edgeId,
                    source: sourceId,
                    target: targetId,
                    animated: true,
                    style: { stroke: '#71717a' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a' },
                });
            }
        }
    }

    // 3. Layout: Simple Level-based approach
    // Calculate ranks (distance from inputs)
    const ranks = new Map<string, number>();
    const visited = new Set<string>();

    const getRank = (nodeId: string): number => {
        if (nodeId.startsWith('input') || nodeId.startsWith('inferred')) return 0;
        // if no incoming edges, rank 0
        const incoming = newEdges.filter(e => e.target === nodeId);
        if (incoming.length === 0) return 0;

        let maxRank = 0;
        incoming.forEach(e => {
             // prevent cycle infinite loop simplistic
             if (!visited.has(e.source)) {
                 // We need a proper topological sort or memoization, but for small graphs:
                 // Just assume inputs are 0 and propagate?
                 // Let's use a multi-pass relaxation
             }
        });
        return 0; 
    };
    
    // Multi-pass rank calculation
    newNodes.forEach(n => ranks.set(n.id, 0));
    for(let i=0; i<5; i++) {
        newEdges.forEach(e => {
            const sRank = ranks.get(e.source) || 0;
            const tRank = ranks.get(e.target) || 0;
            if (sRank + 1 > tRank) {
                ranks.set(e.target, sRank + 1);
            }
        });
    }

    // Apply layout
    const LEVEL_WIDTH = 280;
    const LEVEL_HEIGHT = 120;
    const levelCounts = new Map<number, number>();

    newNodes.forEach(n => {
        const rank = ranks.get(n.id) || 0;
        const count = levelCounts.get(rank) || 0;
        levelCounts.set(rank, count + 1);
        
        n.position = {
            x: 50 + rank * LEVEL_WIDTH,
            y: 50 + count * LEVEL_HEIGHT
        };
    });

    setNodes(newNodes);
    setEdges(newEdges);

  }, [code, setNodes, setEdges]);

  useEffect(() => {
    parseHapf();
  }, [parseHapf]);

  return (
    <div className="w-full h-full bg-[#09090b]">
       <ReactFlow
         nodes={nodes}
         edges={edges}
         onNodesChange={onNodesChange}
         onEdgesChange={onEdgesChange}
         fitView
         minZoom={0.5}
         maxZoom={1.5}
         attributionPosition="bottom-right"
       >
         <Background color="#27272a" gap={20} variant={BackgroundVariant.Dots} />
         <Controls />
         <div className="absolute top-4 right-4 z-10 bg-hapf-panel border border-hapf-border p-2 rounded text-[10px] text-hapf-muted font-mono pointer-events-none opacity-80">
            <div className="flex items-center gap-1 mb-1">
                <Box size={10} className="text-hapf-primary"/> Module
            </div>
            <div className="flex items-center gap-1">
                <FileInput size={10} className="text-hapf-accent"/> Input/Var
            </div>
         </div>
       </ReactFlow>
    </div>
  );
};

export default HapfDiagram;