import { RelevanceScore, CREInput } from "../types";

export const SCORING_WEIGHTS = {
  ACTIVE_FILE: 100,
  STACK_TRACE_FILE: 95,
  SYMBOL_DEFINITION: 90,
  DIRECT_IMPORT: 75,
  SHARED_TYPE: 60,
  GIT_MODIFIED: 50,
  NEARBY_UTILITY: 40,
  DEEP_DEPENDENCY: 20,
};

export class ScoringEngine {
  private scores: Map<string, RelevanceScore> = new Map();

  calculateRelevance(input: CREInput): RelevanceScore[] {
    this.scores.clear();

    // 1. Score Active File
    if (input.activeFile) {
      this.addScore(input.activeFile, SCORING_WEIGHTS.ACTIVE_FILE, "Currently active file in editor");
    }

    // 2. Score Stack Trace Files
    if (input.stackTrace) {
      const paths = this.extractPathsFromStackTrace(input.stackTrace);
      paths.forEach(p => {
        this.addScore(p, SCORING_WEIGHTS.STACK_TRACE_FILE, "Detected in stack trace");
      });
    }

    // 3. Score Git Modified Files
    if (input.gitDiff) {
      input.gitDiff.forEach(p => {
        this.addScore(p, SCORING_WEIGHTS.GIT_MODIFIED, "Recently modified in Git");
      });
    }

    return Array.from(this.scores.values()).sort((a, b) => b.score - a.score);
  }

  private addScore(filePath: string, points: number, reason: string) {
    const existing = this.scores.get(filePath) || {
      filePath,
      score: 0,
      reason: [],
      symbols: []
    };

    existing.score += points;
    existing.reason.push(reason);
    this.scores.set(filePath, existing);
  }

  private extractPathsFromStackTrace(stack: string): string[] {
    // Basic regex to find file paths in typical stack traces
    const pathRegex = /(?:\/|[A-Z]:\\)[^\s:]+(?::\d+){0,2}/g;
    return Array.from(stack.matchAll(pathRegex))
      .map(match => match[0].split(":")[0])
      .filter((p): p is string => !!p);
  }
}
