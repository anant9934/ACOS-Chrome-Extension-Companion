import { FailurePrediction } from "../types";
import { CompiledContextPacket as CPCPacket } from "../../cpc/types";

export class FailurePredictor {
  predict(packet: CPCPacket): FailurePrediction {
    const causes: string[] = [];
    let failureProbability = 0.1;

    // 1. Check for context size vs complexity
    const tokenCount = packet.estimatedTokens;
    if (tokenCount > 15000) {
      failureProbability += 0.3;
      causes.push("High token volume exceeds model reasoning sweetness spot");
    }

    // 2. Check for fragmentation
    const sliceCount = packet.optimizedContext.critical.length + 
                       packet.optimizedContext.important.length;
    if (sliceCount > 15) {
      failureProbability += 0.2;
      causes.push("Excessive semantic fragmentation detected");
    }

    // 3. Check for risk flags from CPC
    if (packet.hallucinationRisk.score === "high") {
      failureProbability += 0.4;
      causes.push("Inherent ambiguity in context selection detected by CPC");
    }

    return {
      failureProbability: Math.min(failureProbability, 1.0),
      primaryCauses: causes,
      recommendedActions: failureProbability > 0.5 ? ["Prune supplemental context", "Focus on specific symbols"] : []
    };
  }
}
