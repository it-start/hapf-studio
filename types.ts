export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  SYSTEM = 'SYSTEM'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  provider?: AIProvider; // Track which AI generated this log
}

export enum PipelineStatus {
  IDLE = 'IDLE',
  INGESTING = 'INGESTING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED'
}

export enum AIProvider {
  GOOGLE = 'GOOGLE',
  MISTRAL = 'MISTRAL',
  COHERE = 'COHERE',
  UNKNOWN = 'UNKNOWN'
}

// --- Self-Reflection HAPF Data Structures ---

export interface VirtualFile {
  path: string;
  intent: string;
  content_hint: string;
}

export interface ProjectArchitecture {
  dependencies: string[];
  store_keys: string[];
  framework: string;
}

export interface GeneratedSpec {
  hapf_code: string;
  description: string;
}

export interface N8nWorkflowData {
  nodes: any[];
  connections: any;
  name: string;
}

export interface Artifacts {
  files: VirtualFile[] | null;
  architecture: ProjectArchitecture | null;
  spec: GeneratedSpec | null;
  // Generic output for other pipeline examples
  genericOutput: any | null;
  n8n_workflow: N8nWorkflowData | null;
}

export interface GithubConfig {
  repoUrl: string;
  token?: string; // Optional PAT
}

export interface N8nConfig {
  instanceUrl: string;
  apiKey?: string;
}

export interface ProviderConfig {
  provider: AIProvider;
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
}