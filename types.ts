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
  CATEGORIZING = 'CATEGORIZING',
  ANALYZING = 'ANALYZING',
  SUMMARIZING = 'SUMMARIZING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED'
}

// --- Financial HAPF Data Structures ---

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
}

export interface CategorizedTransaction {
  transaction: Transaction;
  category: string;
}

export interface Insights {
  total_spending: number;
  spending_per_category: Record<string, number>;
  largest_category: string;
}

export interface SummaryText {
  text: string;
}

export interface Artifacts {
  transactions: Transaction[] | null;
  categorized: CategorizedTransaction[] | null;
  insights: Insights | null;
  summary: SummaryText | null;
}
