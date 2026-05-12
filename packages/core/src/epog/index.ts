/**
 * EPOG-M: Main Pipeline Orchestrator
 *
 * Executes the full 12-stage enterprise optimization pipeline:
 *
 *  1. PII Scan
 *  2. PIR Compilation
 *  3. Intent Classification
 *  4. Governance Evaluation
 *  5. Semantic Deduplication
 *  6. Filler Elimination
 *  7. Code Compression
 *  8. Hallucination Risk Analysis
 *  9. Model Virtualization
 * 10. Final Assembly
 * 11. Semantic Integrity Validation
 * 12. Ledger Sealing
 *
 * All stages are deterministic. Same input → same output. Always.
 */

import { PIIScanner } from "../pii";
import { PromptIRCompiler, PromptIR, PromptRegion } from "../pir";
import { GovernancePolicyEngine, PolicyRegistry } from "../governance";
import { TransformationLedger, LedgerStore, TransformationRecord } from "../ledger";
import { SemanticIntegrityValidator } from "../integrity";
import { estimateTokens } from "../tokens";
import { MODEL_PROFILES } from "../acis/profiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EPOGIntent =
  | "debugging"
  | "refactoring"
  | "architecture"
  | "security-review"
  | "optimization"
  | "documentation"
  | "testing"
  | "compliance-review"
  | "general";

export interface EPOGInput {
  prompt: string;
  targetModel: string;
  sessionId: string;
  /** Allow caller to override intent classification. */
  intentOverride?: EPOGIntent;
  /** Optimization aggression level. */
  optimizationMode?: "safe" | "balanced" | "aggressive";
  /** Max tokens in the final output. Defaults to model's optimal window. */
  tokenBudget?: number;
}

export interface EPOGOutput {
  sessionId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokens: number;
  optimizedTokens: number;
  reductionPercent: number;
  intent: EPOGIntent;
  hallucinationRisk: "low" | "medium" | "high";
  integrityScore: number;
  governanceScore: number;
  isSafeToSubmit: boolean;
  piiDetected: boolean;
  piiCategories: string[];
  pipelineStages: Array<{ stage: string; tokenDelta: number; rationale: string }>;
  transformationRecord: TransformationRecord;
  warnings: string[];
}

// ─── Intent Classifier (enhanced) ────────────────────────────────────────────

interface IntentSignal {
  intent: EPOGIntent;
  keywords: string[];
  weight: number;
}

const INTENT_SIGNALS: IntentSignal[] = [
  { intent: "debugging",        keywords: ["error", "exception", "bug", "fix", "crash", "fail", "stack trace", "undefined", "null pointer", "does not work", "broken"], weight: 1.0 },
  { intent: "refactoring",      keywords: ["refactor", "clean up", "simplify", "restructure", "rewrite", "rename", "extract", "move"], weight: 1.0 },
  { intent: "architecture",     keywords: ["architecture", "design", "pattern", "system design", "how does", "explain how", "structure", "diagram", "overview"], weight: 0.9 },
  { intent: "security-review",  keywords: ["security", "vulnerability", "xss", "injection", "csrf", "auth", "authentication", "authorization", "penetration", "threat"], weight: 1.1 },
  { intent: "optimization",     keywords: ["performance", "slow", "optimize", "faster", "memory", "latency", "throughput", "bottleneck", "profile"], weight: 0.9 },
  { intent: "documentation",    keywords: ["document", "jsdoc", "readme", "comment", "docstring", "explain", "wiki", "spec"], weight: 0.8 },
  { intent: "testing",          keywords: ["test", "spec", "jest", "vitest", "unit test", "integration test", "mock", "coverage", "assert"], weight: 0.9 },
  { intent: "compliance-review",keywords: ["gdpr", "compliance", "legal", "regulation", "policy", "audit", "hipaa", "sox", "privacy"], weight: 1.2 },
];

function classifyIntent(prompt: string): { intent: EPOGIntent; confidence: number } {
  const lower = prompt.toLowerCase();
  const scores = new Map<EPOGIntent, number>();

  for (const signal of INTENT_SIGNALS) {
    let score = 0;
    for (const kw of signal.keywords) {
      const occurrences = (lower.match(new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "g")) ?? []).length;
      score += occurrences * signal.weight;
    }
    if (score > 0) scores.set(signal.intent, (scores.get(signal.intent) ?? 0) + score);
  }

  if (scores.size === 0) return { intent: "general", confidence: 0.5 };

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return { intent: "general", confidence: 0.5 };

  const topScore = top[1];
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);

  return {
    intent: top[0],
    confidence: Math.min(1, topScore / Math.max(1, totalScore)),
  };
}

// ─── Compression Engine ───────────────────────────────────────────────────────

const FILLER_PATTERNS: RegExp[] = [
  /\b(please|kindly)\s+(help\s+me\s+)?(with\s+)?/gi,
  /\bi\s+(was\s+wondering|would\s+like\s+you\s+to|need\s+(help|you)\s+(with|to)|am\s+having\s+(an?\s+)?issue)\s*/gi,
  /\bcould\s+you\s+(please\s+)?(kindly\s+)?/gi,
  /\bwould\s+you\s+(be\s+able\s+to\s+)?/gi,
  /\b(basically|actually|literally|essentially|fundamentally|simply|just)\s+/gi,
  /\b(really|very|quite|rather|somewhat|kind\s+of|sort\s+of)\s+/gi,
  /^\s*#+\s+$/gm,           // Empty markdown headings
  /\n{3,}/g,                 // Excessive blank lines → double newline
];

function eliminateFiller(text: string): string {
  let result = text;
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, (match) => {
      // If the pattern is the blank-lines pattern, compress to double newline
      if (/^\n+$/.test(match)) return "\n\n";
      return " ";
    });
  }
  return result.replace(/[ \t]{2,}/g, " ").trim();
}

function deduplicateLines(text: string): string {
  const seen = new Set<string>();
  const lines = text.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized.length < 10 || !seen.has(normalized)) {
      result.push(line);
      if (normalized.length >= 10) seen.add(normalized);
    }
  }
  return result.join("\n");
}

function compressCodeBlock(code: string, isAPIZone: boolean): string {
  if (isAPIZone) return code; // Never touch API zones

  // Safe compressions only:
  return code
    // Remove comment-only lines (but not JSDoc on functions)
    .replace(/^[ \t]*\/\/.*(?!\n\s*(?:export|function|class|interface|type|const))/gm, "")
    // Remove consecutive blank lines inside code
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Hallucination Risk ───────────────────────────────────────────────────────

function assessHallucinationRisk(pir: PromptIR, finalText: string): "low" | "medium" | "high" {
  const finalTokens = estimateTokens(finalText);
  const codeRegions = pir.regions.filter(r => r.type === "code");
  const hasUnresolvedReferences = codeRegions.some(r =>
    r.flags.some(f => f.key === "has-import") &&
    !pir.regions.some(o => o.type === "code" && o.id !== r.id)
  );

  const fragmentCount = pir.regions.filter(r => r.type === "code").length;

  if (finalTokens > 12000 || fragmentCount > 15 || hasUnresolvedReferences) return "high";
  if (finalTokens > 6000 || fragmentCount > 8) return "medium";
  return "low";
}

// ─── Model Virtualization ─────────────────────────────────────────────────────

function applyModelVirtualization(regions: PromptRegion[], targetModel: string): PromptRegion[] {
  const profile = MODEL_PROFILES[targetModel] ?? MODEL_PROFILES["gpt-4o"]!;
  const copy = [...regions];

  if (profile.preferredStructure === "hierarchical") {
    // Move instructions and constraints to the top
    return [
      ...copy.filter(r => r.type === "instruction" || r.type === "constraint"),
      ...copy.filter(r => r.type !== "instruction" && r.type !== "constraint"),
    ];
  }
  if (profile.preferredStructure === "flat") {
    // Priority sort only
    return copy.sort((a, b) => b.priority - a.priority);
  }
  return copy;
}

// ─── EPOG-M Orchestrator ──────────────────────────────────────────────────────

export class EPOGOrchestrator {
  private piiScanner = new PIIScanner();
  private pirCompiler = new PromptIRCompiler();
  private governance = new GovernancePolicyEngine(new PolicyRegistry());
  private integrityValidator = new SemanticIntegrityValidator();
  public ledgerStore = new LedgerStore();

  async optimize(input: EPOGInput): Promise<EPOGOutput> {
    const { prompt, targetModel, sessionId } = input;
    const warnings: string[] = [];
    const originalTokens = estimateTokens(prompt);
    const ledger = new TransformationLedger(sessionId, prompt, originalTokens, targetModel);

    let workingText = prompt;
    let workingTokens = originalTokens;

    // ── Stage 1: PII Scan ─────────────────────────────────────────────────
    this.piiScanner.resetSession();
    const piiResult = this.piiScanner.scan(workingText);
    ledger.record_step({
      stage: "PII-Scan",
      rationale: piiResult.detections.length > 0
        ? `Detected ${piiResult.detections.length} PII/credential instances: ${piiResult.detections.map(d => d.name).join(", ")}`
        : "No PII or credentials detected.",
      tokensBefore: workingTokens,
      tokensAfter: estimateTokens(piiResult.maskedText),
    });

    if (piiResult.hasCriticalData) {
      workingText = piiResult.maskedText;
      workingTokens = estimateTokens(workingText);
      warnings.push(`⚠️ Critical credentials detected and masked: ${piiResult.detections.filter(d => d.severity === "critical").map(d => d.name).join(", ")}`);
    } else {
      workingText = piiResult.maskedText; // Mask everything, even low-severity
      workingTokens = estimateTokens(workingText);
    }

    // ── Stage 2: PIR Compilation ──────────────────────────────────────────
    const { intent, confidence } = input.intentOverride
      ? { intent: input.intentOverride, confidence: 1.0 }
      : classifyIntent(workingText);

    const pir = this.pirCompiler.compile(workingText, sessionId, intent);
    const tokensAfterPIR = estimateTokens(workingText);
    ledger.record_step({
      stage: "PIR-Compile",
      rationale: `Compiled ${pir.regions.length} regions. Intent: ${intent} (${Math.round(confidence * 100)}% confidence). Language: ${pir.detectedLanguage}`,
      tokensBefore: workingTokens,
      tokensAfter: tokensAfterPIR,
    });
    workingTokens = tokensAfterPIR;

    // ── Stage 3: Governance Evaluation ───────────────────────────────────
    const govResult = this.governance.evaluate(pir);
    ledger.record_step({
      stage: "Governance-Eval",
      rationale: `Score: ${govResult.governanceScore}/100. ${govResult.violations.length} violations. ${govResult.preservedRegionIds.size} regions pinned.`,
      tokensBefore: workingTokens,
      tokensAfter: workingTokens, // No tokens changed — governance only annotates
      affectedRegions: Array.from(govResult.preservedRegionIds),
    });

    if (!govResult.passedValidation) {
      warnings.push(`⚠️ Governance: ${govResult.violations.filter(v => v.severity === "critical").map(v => v.ruleName).join(", ")}`);
    }

    // ── Stage 4: Filler Elimination ───────────────────────────────────────
    const fillerRegions = pir.regions.filter(r => r.type === "filler" || (r.compressible && r.priority < 20));
    let afterFiller = workingText;
    if (fillerRegions.length > 0) {
      afterFiller = eliminateFiller(workingText);
    }
    const tokensAfterFiller = estimateTokens(afterFiller);
    ledger.record_step({
      stage: "Filler-Elimination",
      rationale: `Removed ${fillerRegions.length} filler region(s). Eliminated conversational padding and redundant verbosity.`,
      tokensBefore: workingTokens,
      tokensAfter: tokensAfterFiller,
      affectedRegions: fillerRegions.map(r => r.id),
    });
    workingText = afterFiller;
    workingTokens = tokensAfterFiller;

    // ── Stage 5: Semantic Deduplication ──────────────────────────────────
    const beforeDedup = workingTokens;
    workingText = deduplicateLines(workingText);
    workingTokens = estimateTokens(workingText);
    ledger.record_step({
      stage: "Semantic-Dedup",
      rationale: `Removed ${Math.max(0, beforeDedup - workingTokens)} duplicate tokens via line-level deduplication.`,
      tokensBefore: beforeDedup,
      tokensAfter: workingTokens,
    });

    // ── Stage 6: Code Compression ─────────────────────────────────────────
    const codeRegions = pir.regions.filter(r => r.type === "code" && r.compressible);
    if (codeRegions.length > 0) {
      let compressedText = workingText;
      for (const region of codeRegions) {
        const isAPIZone = region.flags.some(f => f.key === "has-api-signature");
        const compressed = compressCodeBlock(region.content, isAPIZone);
        if (compressed !== region.content) {
          compressedText = compressedText.replace(region.content, compressed);
        }
      }
      const tokensAfterCode = estimateTokens(compressedText);
      ledger.record_step({
        stage: "Code-Compression",
        rationale: `Compressed ${codeRegions.length} compressible code region(s). Removed comment-only lines and excess whitespace within non-API code blocks.`,
        tokensBefore: workingTokens,
        tokensAfter: tokensAfterCode,
        affectedRegions: codeRegions.map(r => r.id),
      });
      workingText = compressedText;
      workingTokens = tokensAfterCode;
    }

    // ── Stage 7: Model Virtualization ─────────────────────────────────────
    const orderedRegions = applyModelVirtualization(pir.regions, targetModel);
    const finalOrderedText = orderedRegions
      .filter(r => r.type !== "filler") // Drop filler regions entirely
      .map(r => r.content)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Use the PIR-assembled version if the regex-based text is shorter
    const useAssembled = finalOrderedText.length < workingText.length && finalOrderedText.length > 0;
    const finalText = useAssembled ? finalOrderedText : workingText;
    const finalTokens = estimateTokens(finalText);

    ledger.record_step({
      stage: "Model-Virtualization",
      rationale: `Reordered context for ${targetModel} (preferred: ${MODEL_PROFILES[targetModel]?.preferredStructure ?? "priority-sorted"}). ${useAssembled ? "PIR assembly used." : "Text-based assembly used."}`,
      tokensBefore: workingTokens,
      tokensAfter: finalTokens,
    });

    // ── Stage 8: Hallucination Risk ───────────────────────────────────────
    const hallucinationRisk = assessHallucinationRisk(pir, finalText);
    ledger.record_step({
      stage: "Hallucination-Risk",
      rationale: `Risk level: ${hallucinationRisk}. Final token count: ${finalTokens}. Code fragments: ${pir.regions.filter(r => r.type === "code").length}.`,
      tokensBefore: finalTokens,
      tokensAfter: finalTokens,
    });

    // ── Stage 9: Semantic Integrity Validation ────────────────────────────
    const integrityReport = this.integrityValidator.validate(pir, finalText);
    ledger.record_step({
      stage: "Integrity-Validation",
      rationale: `Integrity score: ${integrityReport.integrityScore}/100. ${integrityReport.violations.length} violation(s). Safe to submit: ${integrityReport.isSafeToSubmit}.`,
      tokensBefore: finalTokens,
      tokensAfter: finalTokens,
    });

    if (!integrityReport.isSafeToSubmit) {
      warnings.push(`⚠️ Integrity: ${integrityReport.violations.map(v => v.checkName).join(", ")}`);
    }

    // ── Stage 10: Ledger Sealing ──────────────────────────────────────────
    const record = ledger.seal(finalText, finalTokens, govResult.governanceScore);
    this.ledgerStore.save(record);

    const reductionPercent = Math.max(0, Math.round(((originalTokens - finalTokens) / Math.max(1, originalTokens)) * 100));

    return {
      sessionId,
      originalPrompt: prompt,
      optimizedPrompt: finalText,
      originalTokens,
      optimizedTokens: finalTokens,
      reductionPercent,
      intent,
      hallucinationRisk,
      integrityScore: integrityReport.integrityScore,
      governanceScore: govResult.governanceScore,
      isSafeToSubmit: integrityReport.isSafeToSubmit && govResult.passedValidation,
      piiDetected: piiResult.detections.length > 0,
      piiCategories: [...new Set(piiResult.detections.map(d => d.category))],
      pipelineStages: record.entries.map(e => ({
        stage: e.stage,
        tokenDelta: e.tokenDelta,
        rationale: e.rationale,
      })),
      transformationRecord: record,
      warnings,
    };
  }
}

// Singleton — shared across the background worker lifecycle
export const epogOrchestrator = new EPOGOrchestrator();
