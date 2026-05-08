import { HallucinationRisk, ContextSlice } from "../types";

export class RiskAnalyzer {
  analyze(slices: ContextSlice[]): HallucinationRisk {
    const factors: string[] = [];
    const recommendations: string[] = [];
    let score: "low" | "medium" | "high" = "low";

    // Factor 1: Too many files
    if (slices.length > 10) {
      factors.push("High number of disconnected context fragments");
      recommendations.push("Consolidate context into fewer, more comprehensive slices");
      score = "medium";
    }

    // Factor 2: Missing dependencies (Simulated)
    // In a real implementation, we'd check if all imported symbols in slices are also in slices
    const hasUnresolvedImports = false; 
    if (hasUnresolvedImports) {
      factors.push("Unresolved symbol dependencies detected");
      recommendations.push("Include definitions for all imported symbols");
      score = "high";
    }

    // Factor 3: Size
    const totalTokens = slices.reduce((acc, s) => acc + s.tokens, 0);
    if (totalTokens > 8000) {
      factors.push("Context size exceeds optimal reasoning threshold");
      recommendations.push("Prune supplemental context or use semantic summaries");
      if (score === "low") score = "medium";
    }

    return {
      score,
      factors,
      recommendations
    };
  }
}
