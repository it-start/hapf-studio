import React, { useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  BackgroundVariant,
  Position
} from 'reactflow';
import dagre from 'dagre';
import { Box, FileInput, Settings, Cpu, Wind, Cloud, Hexagon } from 'lucide-react';
import { AIProvider } from '../types';

interface HapfDiagramProps {
  code: string;
  activeModule?: string | null;
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
  transition: 'all 0.3s ease'
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

const runtimeNodeStyle = {
  ...nodeStyle,
  borderColor: '#f59e0b', // Warning/Orange
  background: 'rgba(245, 158, 11, 0.05)',
  minWidth: '140px',
  fontSize: '11px',
  borderStyle: 'dotted',
  color: '#fbbf24'
};

const activeNodeStyle = {
  ...moduleNodeStyle,
  borderColor: '#10b981', // Success Green
  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
  transform: 'scale(1.05)',
  zIndex: 9999
};

const getProviderIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('mistral')) return <Wind size={10} className="text-orange-400" />;
    if (t.includes('cohere') || t.includes('command')) return <Hexagon size={10} className="text-teal-400" />;
    return <Cloud size={10} className="text-blue-400" />;
};

const HapfDiagram: React.FC<HapfDiagramProps> = ({ code, activeModule }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Use dagre to layout the graph
  const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Set graph direction: Left to Right
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 });

    nodes.forEach((node) => {
      // Approximate sizes based on node types
      let width = 180;
      let height = 80;
      if (node.type === 'runtime') {
          height = 60;
          width = 150;
      }
      dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        // React Flow node position is top-left, Dagre is center
        position: {
          x: nodeWithPosition.x - (node.type === 'runtime' ? 75 : 90),
          y: nodeWithPosition.y - (node.type === 'runtime' ? 30 : 40),
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  const parseHapf = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Track created nodes to avoid duplicates and help with linking
    const nodeMap = new Map<string, string>(); // name -> id
    const variableMap = new Map<string, string>(); // variableName -> sourceModuleId

    // Helper: Find matching closing brace
    const findBlockEnd = (text: string, startIndex: number): number => {
        let openBraces = 0;
        let inString = false;
        
        for (let i = startIndex; i < text.length; i++) {
            const char = text[i];
            if (char === '"' && text[i-1] !== '\\') {
                inString = !inString;
            }
            
            if (!inString) {
                if (char === '{') openBraces++;
                if (char === '}') {
                    openBraces--;
                    if (openBraces === 0) return i;
                }
            }
        }
        return -1;
    };

    // 1. Scan for Modules and Runtimes
    // We use a manual scan to handle nested braces properly
    let cursor = 0;
    while (cursor < code.length) {
        // Find "module" keyword
        const moduleIdx = code.indexOf('module', cursor);
        if (moduleIdx === -1) break;

        // Ensure it's a standalone word (simple check)
        const prevChar = code[moduleIdx - 1];
        if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) {
             cursor = moduleIdx + 6;
             continue;
        }

        // Extract Name
        const quoteStart = code.indexOf('"', moduleIdx);
        const quoteEnd = code.indexOf('"', quoteStart + 1);
        if (quoteStart === -1 || quoteEnd === -1) { cursor = moduleIdx + 6; continue; }
        
        const moduleName = code.substring(quoteStart + 1, quoteEnd);
        const moduleId = `mod-${moduleName}`;

        // Find Block
        const blockStart = code.indexOf('{', quoteEnd);
        if (blockStart === -1) { cursor = quoteEnd + 1; continue; }
        
        const blockEnd = findBlockEnd(code, blockStart);
        if (blockEnd === -1) { cursor = blockStart + 1; continue; }

        const blockContent = code.substring(blockStart + 1, blockEnd);

        // Check for model provider config in runtime block to determine badge
        let providerIcon = null;
        if (blockContent.includes('mistral')) providerIcon = <Wind size={12} className="text-orange-400 absolute top-2 right-2" />;
        else if (blockContent.includes('cohere') || blockContent.includes('command')) providerIcon = <Hexagon size={12} className="text-teal-400 absolute top-2 right-2" />;
        else if (blockContent.includes('gemini') || blockContent.includes('google')) providerIcon = <Cloud size={12} className="text-blue-400 absolute top-2 right-2" />;

        // Create Module Node
        newNodes.push({
            id: moduleId,
            position: { x: 0, y: 0 },
            data: { label: (
                <div className="flex flex-col gap-1 relative">
                    {providerIcon}
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
        nodeMap.set(moduleName, moduleId);

        // Check for Runtime Block inside Module
        const runtimeRegex = /runtime\s*:/g;
        const rtMatch = runtimeRegex.exec(blockContent);
        
        if (rtMatch) {
            const runtimeIdx = rtMatch.index;
            const rtBlockStart = blockContent.indexOf('{', runtimeIdx);
            
            if (rtBlockStart !== -1) {
                const rtBlockEnd = findBlockEnd(blockContent, rtBlockStart);
                if (rtBlockEnd !== -1) {
                    const rtContent = blockContent.substring(rtBlockStart + 1, rtBlockEnd);
                    
                    // Parse simple key-values
                    const lines = rtContent.split('\n')
                        .map(l => {
                            const commentIdx = l.indexOf('#');
                            return commentIdx !== -1 ? l.substring(0, commentIdx).trim() : l.trim();
                        })
                        .filter(l => l.length > 0)
                        .map(l => l.replace(/["{},]/g, ''));
                    
                    const rtConfig = lines.slice(0, 3).map((l, i) => (
                        <div key={i} className="truncate opacity-80 flex items-center gap-1">
                             {l.includes('model') && getProviderIcon(l)}
                             {l}
                        </div>
                    ));

                    const rtId = `rt-${moduleName}`;
                    
                    // Determine style based on provider
                    let customRuntimeStyle = { ...runtimeNodeStyle };
                    if (rtContent.includes('mistral')) customRuntimeStyle.borderColor = '#f97316'; // Orange
                    if (rtContent.includes('cohere')) customRuntimeStyle.borderColor = '#14b8a6'; // Teal

                    newNodes.push({
                        id: rtId,
                        position: { x: 0, y: 0 },
                        data: { label: (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold border-b border-white/10 pb-1 mb-1" style={{color: customRuntimeStyle.borderColor}}>
                                    <Settings size={12} />
                                    RUNTIME
                                </div>
                                <div className="font-mono text-[10px]">
                                    {rtConfig}
                                </div>
                            </div>
                        )},
                        style: customRuntimeStyle,
                        type: 'runtime' 
                    });

                    // Edge: Module -> Runtime (Dashed)
                    newEdges.push({
                        id: `e-${moduleId}-${rtId}`,
                        source: moduleId,
                        target: rtId,
                        animated: false,
                        style: { stroke: customRuntimeStyle.borderColor, strokeDasharray: '4 4' },
                        markerEnd: { type: MarkerType.ArrowClosed, color: customRuntimeStyle.borderColor },
                    });
                }
            }
        }

        cursor = blockEnd + 1;
    }

    // 2. Scan for Pipelines (same logic as before)
    cursor = 0;
    while (cursor < code.length) {
        const pipelineIdx = code.indexOf('pipeline', cursor);
        if (pipelineIdx === -1) break;

        const prevChar = code[pipelineIdx - 1];
        if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) { cursor = pipelineIdx + 8; continue; }

        const quoteStart = code.indexOf('"', pipelineIdx);
        const quoteEnd = code.indexOf('"', quoteStart + 1);
        const blockStart = code.indexOf('{', quoteEnd);
        const blockEnd = findBlockEnd(code, blockStart);

        if (blockEnd === -1) { cursor = quoteEnd + 1; continue; }
        
        const pipelineContent = code.substring(blockStart + 1, blockEnd);

        // 2a. Functional Syntax: let x = run mod(y) OR run mod(y)
        const runStatementRegex = /(?:let\s+(\w+)\s*=\s*)?run\s+([\w\.]+)\s*\(/g;
        let runMatch;
        while ((runMatch = runStatementRegex.exec(pipelineContent)) !== null) {
            const [fullMatch, outputVar, moduleName] = runMatch;
            const moduleId = nodeMap.get(moduleName);
            
            if (moduleId) {
                if (outputVar) {
                    variableMap.set(outputVar, moduleId);
                }

                const startIndex = runMatch.index + runMatch[0].length;
                const remainder = pipelineContent.substring(startIndex);
                const argsSection = remainder.split(')')[0]; 

                // Input Args
                const inputUsageRegex = /input\.(\w+)/g;
                const inputMatches = [...argsSection.matchAll(inputUsageRegex)];
                inputMatches.forEach(m => {
                   const inputName = m[1];
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
                });

                // Variable Args
                const potentialVars = Array.from(variableMap.keys());
                potentialVars.forEach(v => {
                    const vRegex = new RegExp(`\\b${v}\\b`);
                    if (vRegex.test(argsSection)) {
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

        // 2b. Arrow Syntax: a -> b
        const arrowSplitRegex = /([\w\.]+)\s*(?:→|->)\s*([\w\.]+)/g;
        let arrowMatch;
        while((arrowMatch = arrowSplitRegex.exec(pipelineContent)) !== null) {
            const sourceName = arrowMatch[1];
            const targetName = arrowMatch[2];
            
            let sourceId = nodeMap.get(sourceName);
            let targetId = nodeMap.get(targetName);

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
                targetId = `inferred-${targetName}`;
                if (!newNodes.find(n => n.id === targetId) && !nodeMap.has(targetName)) {
                     newNodes.push({
                        id: targetId,
                        position: { x: 0, y: 0 },
                        data: { label: targetName },
                        style: moduleNodeStyle
                    });
                    nodeMap.set(targetName, targetId);
                } else if (nodeMap.has(targetName)) {
                    targetId = nodeMap.get(targetName)!;
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

        cursor = blockEnd + 1;
    }

    // 3. Apply Dagre Layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

  }, [code, setNodes, setEdges]);

  // Initial Parse
  useEffect(() => {
    parseHapf();
  }, [parseHapf]);

  // Update styles on activeModule change
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => {
        // Check if this node is the active module
        const isActive = activeModule && node.id === `mod-${activeModule}`;
        
        return {
          ...node,
          style: isActive ? activeNodeStyle : (node.type === 'runtime' ? runtimeNodeStyle : (node.id.startsWith('input-') ? inputNodeStyle : moduleNodeStyle)),
        };
      })
    );
  }, [activeModule, setNodes]);

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
         <div className="absolute top-4 right-4 z-10 bg-hapf-panel border border-hapf-border p-2 rounded text-[10px] text-hapf-muted font-mono pointer-events-none opacity-80 shadow-xl">
            <div className="flex items-center gap-1 mb-1">
                <Box size={10} className="text-hapf-primary"/> Module
            </div>
            <div className="flex items-center gap-1 mb-1">
                <Settings size={10} className="text-hapf-warning"/> Runtime
            </div>
            <div className="flex items-center gap-1 mb-1">
                <FileInput size={10} className="text-hapf-accent"/> Input/Var
            </div>
            {activeModule && (
                <div className="mt-2 pt-2 border-t border-hapf-border text-hapf-success font-bold animate-pulse">
                    EXECUTING: {activeModule}
                </div>
            )}
         </div>
       </ReactFlow>
    </div>
  );
};

export default HapfDiagram;