import { GoogleGenAI, Type } from "@google/genai";
import { VirtualFile, ProjectArchitecture, GeneratedSpec, ProviderConfig, AIProvider } from "../types";

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

export interface SimulationStep {
  module: string;
  message: string;
  data_preview?: string;
}

export interface SimulationResult {
  steps: SimulationStep[];
  output: any;
}

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
      2. Agentic Loops: If you encounter a 'loop' construct (e.g. 'loop (attempts < 5)'), you MUST simulate the iterations clearly. 
         - **IMPORTANT**: For Agent workflows, include "[THOUGHT]" logs to show the internal monologue or reasoning of the agent.
           Example: { "module": "agent.planner", "message": "[THOUGHT] The requirement is ambiguous. I need to assume X." }
         - Show the loop variable changing (e.g. "Iteration 1/3") in the logs.
         - Simulate failure/retry cycles for dev-agents (e.g. Test Fails -> Fix -> Test Passes).
      3. Simulate realistic output for each module based on the input context.
      4. If there are conditional branches (if/else), evaluate them based on your simulated data.
      
      Return a JSON object with:
      - steps: An array of execution steps representing the timeline. Each step must have:
          - module: The EXACT name of the module being executed (e.g. "scan.git_walker"). If it's a system action (like "return" or "io.write" or "loop"), use "SYSTEM".
          - message: A log message describing what happened. Use [THOUGHT] prefix for internal reasoning.
          - data_preview: (Optional) A short string representation of the data flowing out of this step (e.g. "5 files found", "Score: 0.8").
      - output: The final result object of the pipeline.`,
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || '{"steps": [], "output": {}}');
};