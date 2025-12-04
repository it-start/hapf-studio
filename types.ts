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
  PLANNING = 'PLANNING',
  WRITING = 'WRITING',
  REVIEWING = 'REVIEWING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED'
}

// HAPF Data Structures defined in the prompt
export interface Insight {
  topic: string;
  source_text: string;
  importance: number;
}

export interface SectionPlan {
  header: string;
  key_points: string[];
  estimated_tokens: number;
}

export interface Outline {
  title: string;
  sections: SectionPlan[];
}

export interface Draft {
  content_markdown: string;
  readability_score: number;
  hallucination_check_passed: boolean;
}

export interface Artifacts {
  insights: Insight[] | null;
  outline: Outline | null;
  draft: Draft | null;
}
