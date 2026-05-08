import { ReasoningDegradation, ModelProfile } from "../types";
import { ContextSlice } from "../../cpc/types";

export class DegradationPredictor {
  predict(slices: ContextSlice[], profile: ModelProfile): ReasoningDegradation {
    const totalTokens = slices.reduce((acc, s) => acc + s.tokens, 0);
    const causes: string[] = [];
    let risk: "low" | "medium" | "high" = "low";
    let recommendedReduction = 0;

    // Rule 1: Context window proximity
    if (totalTokens > profile.optimalDebuggingWindow * 0.9) {
      risk = "high";
      causes.push("Context size approaching model's reasoning breakdown threshold");
      recommendedReduction = 30;
    } else if (totalTokens > profile.optimalDebuggingWindow * 0.7) {
      risk = "medium";
      causes.push("High context density may lead to reasoning degradation");
      recommendedReduction = 15;
    }

    // Rule 2: Fragment count
    if (slices.length > 20) {
      risk = risk === "high" ? "high" : "medium";
      causes.push("Excessive fragmentation may confuse the model's spatial reasoning");
    }

    return {
      risk,
      causes,
      recommendedReduction
    };
  }
}
