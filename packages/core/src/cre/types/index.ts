export type TaskType = 
  | "debugging" 
  | "optimization" 
  | "architecture" 
  | "refactoring" 
  | "testing" 
  | "ui" 
  | "database" 
  | "deployment";

export interface RelevanceScore {
  filePath: string;
  score: number;
  reason: string[];
  symbols: string[];
}

export interface ContextPacket {
  taskType: TaskType;
  primaryFiles: string[];
  secondaryFiles: string[];
  relevantFunctions: string[];
  relevantImports: string[];
  excludedFiles: string[];
  estimatedTokens: number;
  compressionRatio: number;
  reasoning: string[];
  confidenceScore: number;
}

export interface CREInput {
  activeFile?: string;
  cursorPosition?: { line: number; character: number };
  stackTrace?: string;
  diagnostics?: any[];
  gitDiff?: string[];
  prompt?: string;
}
