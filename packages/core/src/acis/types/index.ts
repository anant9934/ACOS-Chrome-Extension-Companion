import { TaskType } from "../../cre/types";
import { CompiledContextPacket as CPCPacket } from "../../cpc/types";

export interface ModelProfile {
  model: string;
  optimalDebuggingWindow: number;
  preferredStructure: "hierarchical" | "flat" | "interleaved";
  hallucinationThreshold: number;
  semanticCompressionTolerance: number;
  snippetDensityPreference: "low" | "medium" | "high";
}

export interface ReasoningDegradation {
  risk: "low" | "medium" | "high";
  causes: string[];
  recommendedReduction: number;
}

export interface ContextEffectiveness {
  effectivenessScore: number;
  clarityScore: number;
  hallucinationProbability: number;
}

export interface ACISOutput {
  adaptedPacket: CPCPacket;
  degradationRisk: ReasoningDegradation;
  effectiveness: ContextEffectiveness;
  strategyUsed: string;
}

export interface ACISInput {
  cpcPacket: CPCPacket;
  targetModel: string;
  taskMode: TaskType;
}
