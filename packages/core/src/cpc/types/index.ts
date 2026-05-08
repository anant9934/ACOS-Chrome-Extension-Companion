import { TaskType, ContextPacket as CREPacket } from "../../cre/types";

export interface OptimizedContext {
  critical: ContextSlice[];
  important: ContextSlice[];
  supplemental: ContextSlice[];
}

export interface ContextSlice {
  filePath: string;
  symbolName?: string;
  content: string;
  tokens: number;
  priority: number;
  reasoning: string;
}

export interface HallucinationRisk {
  score: "low" | "medium" | "high";
  factors: string[];
  recommendations: string[];
}

export interface CompiledContextPacket {
  task: string;
  optimizedContext: OptimizedContext;
  excluded: string[];
  semanticSummaries: string[];
  estimatedTokens: number;
  compressionRatio: number;
  hallucinationRisk: HallucinationRisk;
  reasoning: string[];
}

export interface CPCInput {
  crePacket: CREPacket;
  userPrompt: string;
  tokenBudget: number;
  projectMetadata?: Record<string, any>;
}
