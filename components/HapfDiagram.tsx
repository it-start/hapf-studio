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
import { Box, FileInput, Settings, Cpu } from 'lucide-react';

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

const runtimeNodeStyle = {
  ...nodeStyle,
  borderColor: '#f59e0b', // Warning/Orange
  background: 'rgba(245, 158, 11, 0.05)',
  minWidth: '140px',
  fontSize: '11px',
  borderStyle: 'dotted',
  color: '#fbbf24'
};

const HapfDiagram: React.FC<HapfDiagramProps> = ({ code }) => {
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

        // Create Module Node
        newNodes.push({
            id: moduleId,
            position: { x: 0, y: 0 },
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
        nodeMap.set(moduleName, moduleId);

        // Check for Runtime Block inside Module
        const runtimeIdx = blockContent.indexOf('runtime');
        if (runtimeIdx !== -1) {
            // Find ':' then '{'
            const rtBlockStart = blockContent.indexOf('{', runtimeIdx);
            if (rtBlockStart !== -1) {
                const rtBlockEnd = findBlockEnd(blockContent, rtBlockStart);
                if (rtBlockEnd !== -1) {
                    const rtContent = blockContent.substring(rtBlockStart + 1, rtBlockEnd);
                    
                    // Parse simple key-values
                    const lines = rtContent.split('\n')
                        .map(l => l.trim())
                        .filter(l => l && !l.startsWith('#'))
                        .map(l => l.replace(/["{},]/g, ''));
                    
                    const rtConfig = lines.slice(0, 3).map((l, i) => (
                        <div key={i} className="truncate opacity-80">{l}</div>
                    ));

                    const rtId = `rt-${moduleName}`;
                    newNodes.push({
                        id: rtId,
                        position: { x: 0, y: 0 },
                        data: { label: (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-hapf-warning font-bold border-b border-hapf-warning/20 pb-1 mb-1">
                                    <Settings size={12} />
                                    RUNTIME
                                </div>
                                <div className="font-mono text-[10px]">
                                    {rtConfig}
                                </div>
                            </div>
                        )},
                        style: runtimeNodeStyle,
                        type: 'runtime' // custom marker for dagre sizing
                    });

                    // Edge: Module -> Runtime (Dashed)
                    newEdges.push({
                        id: `e-${moduleId}-${rtId}`,
                        source: moduleId,
                        target: rtId,
                        animated: false,
                        style: { stroke: '#f59e0b', strokeDasharray: '4 4' },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
                    });
                }
            }
        }

        cursor = blockEnd + 1;
    }

    // 2. Scan for Pipelines
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

        // 2a. Functional Syntax: let x = run mod(y)
        const runStartRegex = /let\s+(\w+)\s*=\s*run\s+([\w\.]+)\s*\(/g;
        let runMatch;
        while ((runMatch = runStartRegex.exec(pipelineContent)) !== null) {
            const [_, outputVar, moduleName] = runMatch;
            const moduleId = nodeMap.get(moduleName);
            
            if (moduleId) {
                variableMap.set(outputVar, moduleId);

                const startIndex = runMatch.index + runMatch[0].length;
                const remainder = pipelineContent.substring(startIndex);
                const argsSection = remainder.split(')')[0]; // Simple approx

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
                    // Check if variable is used as full word in args
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

            // Infer source/target if missing
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
                // Check if target is 'inferred' or defined later
                targetId = `inferred-${targetName}`;
                // Only create if we haven't seen this ID
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
         <div className="absolute top-4 right-4 z-10 bg-hapf-panel border border-hapf-border p-2 rounded text-[10px] text-hapf-muted font-mono pointer-events-none opacity-80 shadow-xl">
            <div className="flex items-center gap-1 mb-1">
                <Box size={10} className="text-hapf-primary"/> Module
            </div>
            <div className="flex items-center gap-1 mb-1">
                <Settings size={10} className="text-hapf-warning"/> Runtime
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