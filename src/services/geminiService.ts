
import { GoogleGenAI, Type } from "@google/genai";
import { VirtualFile, ProjectArchitecture, GeneratedSpec, ProviderConfig, AIProvider, N8nWorkflowData, SimulationResult } from "../types";

// NOTE: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-2.5-flash';

/**
 * Module 1: Ingest Virtual FS
 * input: JSON string
 * output: List<VirtualFile>
 */
export const runIngestFiles = async (jsonInput: string): Promise<VirtualFile[]> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Parse the following JSON input into a list of VirtualFile objects.
    
    <json_input>
    ${jsonInput}
    </json_input>`,
    config: {
      systemInstruction: "You are a Virtual File System parser. Extract the file list from the 'virtual_files' key in the JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            path: { type: Type.STRING },
            intent: { type: Type.STRING },
            content_hint: { type: Type.STRING },
          },
          required: ["path", "intent", "content_hint"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

/**
 * Module 2: Analyze Architecture
 * input: List<VirtualFile>
 * output: ProjectArchitecture
 */
export const runAnalyzeArchitecture = async (files: VirtualFile[]): Promise<ProjectArchitecture> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Analyze these virtual files to determine the project architecture: ${JSON.stringify(files)}`,
    config: {
      systemInstruction: "Analyze the file hints. Extract dependencies (e.g., from package.json hints), state keys (from store hints), and the framework.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dependencies: { 
            type: Type.ARRAY,
            items: { type: Type.STRING } 
          },
          store_keys: { 
            type: Type.ARRAY,
            items: { type: Type.STRING } 
          },
          framework: { type: Type.STRING },
        },
        required: ["dependencies", "store_keys", "framework"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Module 3: Generate HAPF Spec
 * input: ProjectArchitecture
 * output: GeneratedSpec
 */
export const runGenerateSpec = async (arch: ProjectArchitecture): Promise<GeneratedSpec> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Generate a HAPF v1.0 specification for a project with this architecture: ${JSON.stringify(arch)}.`,
    config: {
      systemInstruction: "Generate a valid HAPF v1.0 code block describing this architecture. Include modules for the main components.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hapf_code: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["hapf_code", "description"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Generic Pipeline Simulator
 * Simulates execution of ANY HAPF code based on input.
 */
export const runGenericPipelineSimulation = async (
  hapfCode: string, 
  inputData: string,
  providers?: Record<AIProvider, ProviderConfig>
): Promise<SimulationResult> => {
  
  // Construct a description of available "Real" providers
  let providerContext = "Running in DEFAULT SIMULATION mode (Gemini Only).";
  if (providers) {
      const active = Object.values(providers).filter(p => p.enabled);
      if (active.length > 0) {
          const prodProviders = active.filter(p => p.apiKey && p.apiKey.length > 0).map(p => p.provider);
          if (prodProviders.length > 0) {
             providerContext = `Running in PRODUCTION MODE. The user has provided API keys for: [${prodProviders.join(', ')}]. 
             You must Simulate the EXACT latency, verbosity, and stylistic characteristics of these providers when the HAPF code requests them in 'runtime'.
             For example, if 'mistral-large' is requested, generate logs that look like Mistral's verbose output.`;
          } else {
             providerContext = `Running in SIMULATION MODE. The user has enabled: [${active.map(p => p.provider).join(', ')}] but provided NO keys. Mimic them genericallly.`;
          }
      }
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: `
    HAPF CODE:
    ${hapfCode}

    INPUT DATA:
    ${inputData}
    `,
    config: {
      systemInstruction: `You are the HAPF v1.0 Runtime Simulator. 
      ${providerContext}
      
      Execute the provided HAPF pipeline code using the Input Data.
      Since you do not have access to real external tools (OCR, Kafka, Shell), YOU MUST SIMULATE the execution.
      
      Rules:
      1. Trace the pipeline logic step-by-step.
      2. Agentic Loops: If you encounter a 'loop' construct (e.g. 'loop (i < depth)'), you MUST simulate the iterations clearly based on the variable input.
         - **IMPORTANT**: If 'depth' is 3, show 3 iterations. If 5, show 5. STRICTLY respect loop bounds.
         - For Deep Research or Agent workflows, you MUST include "[THOUGHT]" logs to show the internal monologue.
           Example: { "module": "research.planner", "message": "[THOUGHT] Iteration 2/3: Previous results were too broad. Narrowing focus to 'Edge Caching'." }
      
      3. **Edge & Security Simulation**: 
         - If the code defines 'edge' localities or 'security' blocks (e.g., mTLS), you MUST simulate those artifacts.
         - **Security Enforcement**: If 'security.enforce' is true, log specific certificate validation steps (e.g., "Client Cert Verified").
         - Log messages should reflect network conditions.
         - Examples:
           - "[EDGE] Local Cache Hit (0.2ms)"
           - "[NET] Establishing mTLS Handshake with region: us-east-1"
           - "[SEC] Client Certificate Verified (CN=edge-node-01, Issuer=HAPF-CA)"
           - "[SEC] Encrypted Tunnel Established (TLS 1.3, AES-256-GCM)"
      
      4. Simulate realistic output for each module based on the input context.
      5. If there are conditional branches (if/else), evaluate them based on your simulated data.
      
      Return a JSON object with:
      - steps: An array of execution steps representing the timeline. Each step must have:
          - module: The EXACT name of the module being executed (e.g. "scan.git_walker"). If it's a system action (like "return" or "io.write" or "loop"), use "SYSTEM".
          - message: A log message describing what happened. Use [THOUGHT] prefix for internal reasoning.
          - data_preview: (Optional) A short string representation of the data flowing out of this step (e.g. "5 files found", "Score: 0.8").
      - output: The final result object of the pipeline.`,
      responseMimeType: "application/json",
    }
  });

  const parsedJson = JSON.parse(response.text || '{"steps": [], "output": {}}');

  return {
    ...parsedJson,
    usage: {
      promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
      candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
    }
  };
};

/**
 * HAPF to n8n Compiler
 * Transpiles HAPF code into an n8n JSON Workflow
 */
export const runCompileToN8n = async (hapfCode: string, instanceUrl: string): Promise<N8nWorkflowData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Compile this HAPF code into a VALID n8n Workflow JSON structure.
    
    HAPF CODE:
    ${hapfCode}
    
    Target Instance URL: ${instanceUrl || "http://localhost:5678"}
    `,
    config: {
      systemInstruction: `You are a HAPF to n8n Compiler.
      Convert the logic, modules, and flow of the HAPF code into a valid n8n JSON workflow object (containing 'nodes' and 'connections').
      
      CRITICAL: The output must strictly follow the n8n schema format and use the correct node types.
      
      REFERENCE SCHEMA (Your output must match this structure):
      {
        "name": "Workflow Name",
        "nodes": [
          {
            "parameters": { "path": "webhook", "httpMethod": "POST" },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [250, 300],
            "id": "node1"
          },
          {
            "parameters": { "content": "// Javascript code here" },
            "name": "Code Step",
            "type": "n8n-nodes-base.code",
            "typeVersion": 1,
            "position": [500, 300],
            "id": "node2"
          },
          {
             "parameters": { "resource": "message", "operation": "post", "text": "...", "channel": "#general" },
             "name": "Slack",
             "type": "n8n-nodes-base.slack",
             "typeVersion": 2,
             "position": [750, 300],
             "id": "node3"
          }
        ],
        "connections": {
          "Webhook": {
            "main": [
              [ { "node": "Code Step", "type": "main", "index": 0 } ]
            ]
          },
          "Code Step": {
            "main": [
              [ { "node": "Slack", "type": "main", "index": 0 } ]
            ]
          }
        }
      }

      Mapping Rules:
      1. 'input.webhook' or 'input.stream' -> Node 'Webhook' (n8n-nodes-base.webhook).
      2. 'run module()' -> 
         - If module runtime.tool is 'slack', use 'n8n-nodes-base.slack'.
         - If runtime.tool is 'http', use 'n8n-nodes-base.httpRequest'.
         - If module is AI or Logic, use 'n8n-nodes-base.code'. IMPORTANT: Put the code logic inside the "parameters": { "content": "..." } field.
      3. 'if/else' -> 'n8n-nodes-base.if'.
      4. Position: Increment X by 250 for each step to ensure layout.
      5. IDs: Generate unique string IDs (e.g. 'node1', 'node2').
      6. Connections: Map keys are NODE NAMES (e.g. "Webhook"), not IDs.
      
      Output ONLY the JSON object.
      `,
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || '{"nodes": [], "connections": {}, "name": "Untitled Workflow"}');
};
