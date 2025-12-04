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
}

export enum PipelineStatus {
  IDLE = 'IDLE',
  INGESTING = 'INGESTING',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED'
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

export interface Artifacts {
  files: VirtualFile[] | null;
  architecture: ProjectArchitecture | null;
  spec: GeneratedSpec | null;
}

export interface GithubConfig {
  repoUrl: string;
  token?: string; // Optional PAT
}