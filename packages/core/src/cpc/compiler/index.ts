import { CPCInput, CompiledContextPacket, ContextSlice } from "../types";
import { SemanticSlicer } from "../slicing";
import { TokenScheduler } from "../scheduler";
import { RiskAnalyzer } from "../risk";
import { SemanticCompressor } from "../compression";
import { estimateTokens } from "../../tokens";

export class ContextPacketCompiler {
  private slicer = new SemanticSlicer();
  private riskAnalyzer = new RiskAnalyzer();
  private compressor = new SemanticCompressor();

  async compile(input: CPCInput): Promise<CompiledContextPacket> {
    const scheduler = new TokenScheduler(input.tokenBudget);
    const slices: ContextSlice[] = [];

    // 1. Process Primary Files (Full Slicing)
    for (const filePath of input.crePacket.primaryFiles) {
      // For MVP, we take the whole file if it's primary, 
      // but in a refined version, we'd slice it.
      const content = ""; // Placeholder for file read
      slices.push({
        filePath,
        content,
        tokens: estimateTokens(content),
        priority: 100,
        reasoning: "Primary file identified by CRE"
      });
    }

    // 2. Process Secondary Files (Summarization/Slicing)
    for (const filePath of input.crePacket.secondaryFiles) {
      const content = ""; // Placeholder
      const tokens = estimateTokens(content);
      
      if (tokens > 500) {
        // High token cost for secondary file -> Summarize
        const summary = this.compressor.summarize(content, filePath);
        slices.push({
          filePath,
          content: summary,
          tokens: estimateTokens(summary),
          priority: 50,
          reasoning: "Secondary file summarized due to size"
        });
      } else {
        slices.push({
          filePath,
          content,
          tokens,
          priority: 60,
          reasoning: "Secondary file included"
        });
      }
    }

    // 3. Schedule Tokens
    const optimizedContext = scheduler.allocate(slices);

    // 4. Analyze Risk
    const allIncludedSlices = [
      ...optimizedContext.critical,
      ...optimizedContext.important,
      ...optimizedContext.supplemental
    ];
    const hallucinationRisk = this.riskAnalyzer.analyze(allIncludedSlices);

    // 5. Calculate Final Stats
    const totalTokens = allIncludedSlices.reduce((acc, s) => acc + s.tokens, 0);

    return {
      task: input.userPrompt,
      optimizedContext,
      excluded: input.crePacket.excludedFiles,
      semanticSummaries: allIncludedSlices
        .filter(s => s.content.includes("(Compressed)"))
        .map(s => s.filePath),
      estimatedTokens: totalTokens,
      compressionRatio: totalTokens / (input.crePacket.estimatedTokens || 1), // Simplification
      hallucinationRisk,
      reasoning: allIncludedSlices.map(s => `${s.filePath}: ${s.reasoning}`)
    };
  }
}
