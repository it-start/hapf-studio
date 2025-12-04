import { GoogleGenAI, Type } from "@google/genai";
import { VirtualFile, ProjectArchitecture, GeneratedSpec } from "../types";

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