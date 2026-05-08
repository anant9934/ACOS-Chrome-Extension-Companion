import { ACISInput, ACISOutput } from "../types";
import { ProfileRegistry } from "../profiles";
import { SemanticOrderer } from "../ordering";
import { DegradationPredictor } from "../risk";
import { ProjectFingerprinter } from "./fingerprint";

export class AdaptiveContextIntelligenceSystem {
  private profiles = new ProfileRegistry();
  private orderer = new SemanticOrderer();
  private predictor = new DegradationPredictor();
  private fingerprinter = new ProjectFingerprinter();

  async adapt(input: ACISInput): Promise<ACISOutput> {
    const profile = this.profiles.getProfile(input.targetModel);
    const packet = input.cpcPacket;

    // 1. Re-order slices based on task mode and model profile
    const allSlices = [
      ...packet.optimizedContext.critical,
      ...packet.optimizedContext.important,
      ...packet.optimizedContext.supplemental
    ];

    const orderedSlices = this.orderer.order(allSlices, input.taskMode);

    // 2. Identify Project Type
    const projectType = this.fingerprinter.identify(orderedSlices.map(s => s.filePath));

    // 3. Predict Degradation
    const degradationRisk = this.predictor.predict(orderedSlices, profile);

    // 4. Score Effectiveness (Simulated)
    const effectiveness = {
      effectivenessScore: 0.85,
      clarityScore: 0.9,
      hallucinationProbability: 0.1
    };

    return {
      adaptedPacket: {
        ...packet,
        optimizedContext: {
          critical: orderedSlices.filter(s => s.priority >= 90),
          important: orderedSlices.filter(s => s.priority >= 60 && s.priority < 90),
          supplemental: orderedSlices.filter(s => s.priority < 60)
        }
      },
      degradationRisk,
      effectiveness,
      strategyUsed: `Model-specific reordering for ${input.targetModel} on a ${projectType} project`
    };
  }
}
