import { ACISOutput } from "../../acis/types";

export interface SemanticNode {
  id: string;
  type: "file" | "symbol" | "error" | "event";
  metadata: Record<string, any>;
}

export interface SemanticEdge {
  from: string;
  to: string;
  type: "import" | "call" | "reference" | "cause";
  weight: number;
}

export interface FailurePrediction {
  failureProbability: number;
  primaryCauses: string[];
  recommendedActions: string[];
}

export interface WorkspaceTopology {
  type: "monorepo" | "standalone" | "microservices";
  boundaries: string[];
  serviceMap: Record<string, string[]>;
}

export interface ACOSState {
  currentProject: string;
  topology: WorkspaceTopology;
  activeContextId: string;
  lastOrchestration: number;
}

export interface ACOSOutput {
  acisOutput: ACISOutput;
  prediction: FailurePrediction;
  continuityScore: number;
  cognitiveBandwidth: number;
}
