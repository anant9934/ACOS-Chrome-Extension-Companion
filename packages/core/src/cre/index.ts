import { CREInput, ContextPacket } from "./types";
import { ScoringEngine } from "./scoring";
import { DependencyGraph } from "./graph";
import { ASTAnalyzer } from "./ast";
import { PromptClassifier } from "./classifier";
import { compressText } from "../compression";
import { estimateTokens } from "../tokens";

export class ContextRelevanceEngine {
  private scorer = new ScoringEngine();
  private classifier = new PromptClassifier();
  private astAnalyzer = new ASTAnalyzer();

  async process(input: CREInput): Promise<ContextPacket> {
    // 1. Classify Task
    const taskType = this.classifier.classify(input.prompt || "");

    // 2. Score Relevance
    const scores = this.scorer.calculateRelevance(input);

    // 3. Select Files (threshold based)
    const THRESHOLD = 40;
    const selectedFiles = scores.filter(s => s.score >= THRESHOLD);
    const excludedFiles = scores.filter(s => s.score < THRESHOLD).map(s => s.filePath);

    // 4. Generate Reasoning
    const reasoning = selectedFiles.map(s => `${s.filePath}: ${s.reason.join(", ")}`);

    // 5. Calculate Tokens (Simulated)
    // In real implementation, we'd read files and compress them
    const estimatedTokens = 1000; // Placeholder
    const compressionRatio = 0.65; // Placeholder

    return {
      taskType,
      primaryFiles: selectedFiles.filter(s => s.score >= 90).map(s => s.filePath),
      secondaryFiles: selectedFiles.filter(s => s.score < 90).map(s => s.filePath),
      relevantFunctions: [],
      relevantImports: [],
      excludedFiles,
      estimatedTokens,
      compressionRatio,
      reasoning,
      confidenceScore: 0.85
    };
  }
}

export * from "./types";
