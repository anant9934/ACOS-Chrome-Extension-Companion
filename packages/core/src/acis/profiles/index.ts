import { ModelProfile } from "../types";

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  "gpt-4o": {
    model: "gpt-4o",
    optimalDebuggingWindow: 12000,
    preferredStructure: "hierarchical",
    hallucinationThreshold: 0.72,
    semanticCompressionTolerance: 0.8,
    snippetDensityPreference: "medium"
  },
  "claude-3-sonnet": {
    model: "claude-3-sonnet",
    optimalDebuggingWindow: 20000,
    preferredStructure: "flat",
    hallucinationThreshold: 0.85,
    semanticCompressionTolerance: 0.9,
    snippetDensityPreference: "high"
  },
  "gemini-1.5-pro": {
    model: "gemini-1.5-pro",
    optimalDebuggingWindow: 50000,
    preferredStructure: "flat",
    hallucinationThreshold: 0.65,
    semanticCompressionTolerance: 0.6,
    snippetDensityPreference: "low"
  },
  "ollama-llama3": {
    model: "ollama-llama3",
    optimalDebuggingWindow: 8000,
    preferredStructure: "hierarchical",
    hallucinationThreshold: 0.55,
    semanticCompressionTolerance: 0.5,
    snippetDensityPreference: "medium"
  }
};

export class ProfileRegistry {
  getProfile(modelName: string): ModelProfile {
    return MODEL_PROFILES[modelName] || MODEL_PROFILES["gpt-4o"]!;
  }
}
