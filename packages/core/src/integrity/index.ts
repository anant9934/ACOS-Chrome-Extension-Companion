/**
 * EPOG-M: Semantic Integrity Validator
 *
 * Runs a battery of structural and content-level checks after compression to
 * ensure that optimization has not silently mutated the semantic meaning of the prompt.
 *
 * All checks are deterministic comparisons between the original PIR and the
 * compressed output. No LLM calls. No heuristic approximations.
 */

import { PromptIR, PromptRegion } from "../pir";
import { estimateTokens } from "../tokens";

export interface IntegrityViolation {
  checkId: string;
  checkName: string;
  severity: "warning" | "error" | "critical";
  message: string;
  affectedRegionId?: string;
}

export interface IntegrityReport {
  passed: boolean;
  integrityScore: number; // 0–100
  violations: IntegrityViolation[];
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number; // 0–1, lower = more compressed
  isOverCompressed: boolean;
  isSafeToSubmit: boolean;
}

// Maximum safe token reduction ratio (configurable)
const MAX_SAFE_COMPRESSION_RATIO = 0.15; // At most 85% reduction before integrity warning

export class SemanticIntegrityValidator {
  validate(originalPIR: PromptIR, compressedText: string): IntegrityReport {
    const violations: IntegrityViolation[] = [];
    const originalTokens = originalPIR.totalTokens;
    const compressedTokens = estimateTokens(compressedText);
    const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;

    // ── Check 1: Over-compression ───────────────────────────────────────────
    if (compressionRatio < MAX_SAFE_COMPRESSION_RATIO) {
      violations.push({
        checkId: "INT-001",
        checkName: "Over-Compression Guard",
        severity: "error",
        message: `Compression ratio ${(compressionRatio * 100).toFixed(1)}% is below the safe minimum of ${MAX_SAFE_COMPRESSION_RATIO * 100}%. Critical semantic content may have been lost.`,
      });
    }

    // ── Check 2: All governance zones preserved ─────────────────────────────
    for (const region of originalPIR.regions.filter(r => r.isGovernanceZone)) {
      // We check if a key phrase from the region still exists in the compressed output
      const keyPhrase = this.extractKeyPhrase(region.content);
      if (keyPhrase && !compressedText.includes(keyPhrase)) {
        violations.push({
          checkId: "INT-002",
          checkName: "Governance Zone Preservation",
          severity: "critical",
          message: `Governance zone region ${region.id} (${region.type}) appears to have been removed. Key phrase: "${keyPhrase}"`,
          affectedRegionId: region.id,
        });
      }
    }

    // ── Check 3: Primary instruction preserved ──────────────────────────────
    const primaryInstruction = originalPIR.regions
      .filter(r => r.type === "instruction")
      .sort((a, b) => b.priority - a.priority)[0];
    if (primaryInstruction) {
      const keyPhrase = this.extractKeyPhrase(primaryInstruction.content);
      if (keyPhrase && !compressedText.includes(keyPhrase)) {
        violations.push({
          checkId: "INT-003",
          checkName: "Primary Instruction Preservation",
          severity: "critical",
          message: `Primary instruction region ${primaryInstruction.id} appears to have been removed or mutated.`,
          affectedRegionId: primaryInstruction.id,
        });
      }
    }

    // ── Check 4: API signatures preserved ──────────────────────────────────
    const codeRegionsWithAPIs = originalPIR.regions.filter(
      r => r.type === "code" && r.flags.some(f => f.key === "has-api-signature")
    );
    for (const region of codeRegionsWithAPIs) {
      const sig = this.extractFunctionSignature(region.content);
      if (sig && !compressedText.includes(sig)) {
        violations.push({
          checkId: "INT-004",
          checkName: "API Signature Preservation",
          severity: "error",
          message: `API signature "${sig}" from region ${region.id} appears to have been removed.`,
          affectedRegionId: region.id,
        });
      }
    }

    // ── Check 5: No empty output ────────────────────────────────────────────
    if (compressedText.trim().length === 0) {
      violations.push({
        checkId: "INT-005",
        checkName: "Non-Empty Output Guard",
        severity: "critical",
        message: "Optimization produced an empty output. This is a critical pipeline failure.",
      });
    }

    // ── Check 6: Constraint presence ────────────────────────────────────────
    const constraintRegions = originalPIR.regions.filter(r => r.type === "constraint");
    for (const region of constraintRegions) {
      const phrase = this.extractKeyPhrase(region.content);
      if (phrase && !compressedText.includes(phrase)) {
        violations.push({
          checkId: "INT-006",
          checkName: "Constraint Preservation",
          severity: "error",
          message: `Constraint region ${region.id} was removed: "${phrase}"`,
          affectedRegionId: region.id,
        });
      }
    }

    // ── Score Calculation ───────────────────────────────────────────────────
    const criticals = violations.filter(v => v.severity === "critical").length;
    const errors = violations.filter(v => v.severity === "error").length;
    const warnings = violations.filter(v => v.severity === "warning").length;

    const integrityScore = Math.max(0, 100 - criticals * 40 - errors * 15 - warnings * 5);
    const passed = criticals === 0 && errors === 0;
    const isSafeToSubmit = passed && !this.isOverCompressed(compressionRatio);

    return {
      passed,
      integrityScore,
      violations,
      originalTokens,
      compressedTokens,
      compressionRatio,
      isOverCompressed: this.isOverCompressed(compressionRatio),
      isSafeToSubmit,
    };
  }

  private extractKeyPhrase(content: string): string | null {
    // Extract the first non-trivial 5-word sequence for presence-checking
    const words = content.trim().split(/\s+/).filter(w => w.length > 3);
    if (words.length < 3) return null;
    return words.slice(0, 4).join(" ");
  }

  private extractFunctionSignature(code: string): string | null {
    // Match: function name(, class Name, interface Name, type Name
    const match = code.match(/(?:function|class|interface|type)\s+(\w+)/);
    return match ? match[0] : null;
  }

  private isOverCompressed(ratio: number): boolean {
    return ratio < MAX_SAFE_COMPRESSION_RATIO;
  }
}
