import React from 'react';

export const INITIAL_HAPF_CODE = `package "hapf-web-studio-self-reflection" {
  version: "1.0.0"
  doc: "Analyzes a synthetic project and generates a HAPF spec."
}

# --- Data Contract ---
type VirtualFile {
  path: String
  intent: String
  content_hint: String
}

type ProjectArchitecture {
  dependencies: List<String>
  store_keys: List<String>
  framework: String
}

# --- Module: Ingest Virtual FS ---
module "ingest.virtual_fs" {
  input: "JSON_Config"
  output: "List<VirtualFile>"
  
  ai.task: """
    Parse the input JSON configuration simulating a file system.
    Identify file intents and content hints.
  """
}

# --- Module: Analyze Architecture ---
module "analyze.architecture" {
  input: "List<VirtualFile>"
  output: "ProjectArchitecture"

  ai.task: """
    Analyze the virtual files. 
    1. Extract dependencies from package.json hints.
    2. Identify state keys from store files.
    3. Determine the primary framework (e.g., React, Vue).
  """
}

# --- Module: Generate HAPF Spec ---
module "generate.spec" {
  input: "ProjectArchitecture"
  output: "HAPF_Code"

  ai.task: """
    Generate a valid HAPF v1.0 specification that describes the 
    analyzed software architecture. Define Modules for the components found.
  """
}

# --- Pipeline: Reverse Engineer Repo ---
pipeline "reverse_engineer_repo" {
  steps: [
    ingest.virtual_fs → analyze.architecture → generate.spec
  ]
}`;

export const DEFAULT_INPUT_TEXT = `{
  "input_source": "synthetic_archetype",
  "virtual_files": [
    {
      "path": "package.json",
      "intent": "Dependencies",
      "content_hint": "deps: react, vite, bun, framer-motion; scripts: dev, build"
    },
    {
      "path": "vite.config.ts",
      "intent": "Build Config",
      "content_hint": "plugins: [react()], proxy setup, alias: @ -> src"
    },
    {
      "path": "src/store/hapfStore.ts",
      "intent": "State Management",
      "content_hint": "Store holding 'currentCode', 'logs', 'isRunning', 'artifacts'"
    },
    {
      "path": "src/engine/RuntimeCore.ts",
      "intent": "Business Logic",
      "content_hint": "Function parseHapf(code) -> AST; Function executeStep(step)"
    }
  ]
}`;