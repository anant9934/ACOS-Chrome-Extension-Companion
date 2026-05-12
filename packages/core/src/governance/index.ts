/**
 * EPOG-M: Governance Policy Engine
 *
 * Evaluates a PromptIR against a set of ordered, deterministic governance rules.
 * Rules are pure functions — no side effects. Results are deterministic.
 *
 * Enterprise deployments can inject custom rules via the PolicyRegistry.
 */

import { PromptRegion, PromptIR } from "../pir";

export type PolicyAction = "preserve" | "mask" | "block" | "warn";
export type PolicySeverity = "info" | "warning" | "error" | "critical";

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  /** Pure predicate — returns true if this rule applies to the region. */
  match: (region: PromptRegion, pir: PromptIR) => boolean;
  action: PolicyAction;
  severity: PolicySeverity;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  regionId: string;
  action: PolicyAction;
  severity: PolicySeverity;
  message: string;
}

export interface PolicyEvaluationResult {
  violations: PolicyViolation[];
  blockedRegionIds: Set<string>;
  maskedRegionIds: Set<string>;
  preservedRegionIds: Set<string>;
  governanceScore: number; // 0–100. 100 = fully clean.
  passedValidation: boolean;
}

// ─── Built-in Rules ───────────────────────────────────────────────────────────

const BUILT_IN_RULES: GovernanceRule[] = [
  {
    id: "GOV-001",
    name: "Preserve Compliance Language",
    description: "Legal, regulatory, and compliance text must never be compressed, removed, or mutated.",
    match: (r) => r.isGovernanceZone || r.type === "compliance",
    action: "preserve",
    severity: "critical",
  },
  {
    id: "GOV-002",
    name: "Preserve API Contracts",
    description: "Regions containing function signatures, interface definitions, or type contracts must not be altered.",
    match: (r) => r.type === "code" && r.flags.some(f => f.key === "has-api-signature"),
    action: "preserve",
    severity: "error",
  },
  {
    id: "GOV-003",
    name: "Preserve Import Declarations",
    description: "Import/require statements define dependency contracts that must not be removed.",
    match: (r) => r.type === "code" && r.flags.some(f => f.key === "has-import"),
    action: "preserve",
    severity: "error",
  },
  {
    id: "GOV-004",
    name: "Block Unmasked Credentials",
    description: "Prompts must not transmit credentials, API keys, or secrets without prior masking.",
    match: (r) => r.flags.some(f => f.key === "has-secret-hint"),
    action: "warn",
    severity: "critical",
  },
  {
    id: "GOV-005",
    name: "Preserve Explicit Constraints",
    description: "User-defined constraints (never, must, always) form behavioral contracts and must be preserved.",
    match: (r) => r.type === "constraint",
    action: "preserve",
    severity: "error",
  },
  {
    id: "GOV-006",
    name: "Allow Filler Removal",
    description: "Conversational filler with no semantic value is eligible for safe removal.",
    match: (r) => r.type === "filler",
    action: "warn",
    severity: "info",
  },
  {
    id: "GOV-007",
    name: "Limit Example Duplication",
    description: "More than 3 consecutive example blocks increases token cost without improving reasoning.",
    match: (r, pir) => {
      if (r.type !== "example") return false;
      const exampleRegions = pir.regions.filter(x => x.type === "example");
      return exampleRegions.length > 3 && exampleRegions.indexOf(r) >= 3;
    },
    action: "warn",
    severity: "warning",
  },
  {
    id: "GOV-008",
    name: "Preserve Primary Instruction",
    description: "The highest-priority instruction region is the core task — must never be removed or compressed.",
    match: (r, pir) => {
      if (r.type !== "instruction") return false;
      const topInstruction = pir.regions
        .filter(x => x.type === "instruction")
        .sort((a, b) => b.priority - a.priority)[0];
      return topInstruction?.id === r.id;
    },
    action: "preserve",
    severity: "error",
  },
];

// ─── Policy Registry ──────────────────────────────────────────────────────────

export class PolicyRegistry {
  private rules: GovernanceRule[] = [...BUILT_IN_RULES];

  /** Add enterprise-specific custom rules. */
  addRule(rule: GovernanceRule): void {
    // Prevent duplicates
    if (!this.rules.find(r => r.id === rule.id)) {
      this.rules.push(rule);
    }
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getRules(): GovernanceRule[] {
    return [...this.rules];
  }
}

// ─── Governance Engine ────────────────────────────────────────────────────────

export class GovernancePolicyEngine {
  private registry: PolicyRegistry;

  constructor(registry?: PolicyRegistry) {
    this.registry = registry ?? new PolicyRegistry();
  }

  evaluate(pir: PromptIR): PolicyEvaluationResult {
    const violations: PolicyViolation[] = [];
    const blockedRegionIds = new Set<string>();
    const maskedRegionIds = new Set<string>();
    const preservedRegionIds = new Set<string>();

    const rules = this.registry.getRules();

    for (const region of pir.regions) {
      for (const rule of rules) {
        if (!rule.match(region, pir)) continue;

        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          regionId: region.id,
          action: rule.action,
          severity: rule.severity,
          message: `[${rule.id}] ${rule.name}: Region ${region.id} (${region.type}) — ${rule.description}`,
        });

        if (rule.action === "preserve") preservedRegionIds.add(region.id);
        if (rule.action === "mask") maskedRegionIds.add(region.id);
        if (rule.action === "block") blockedRegionIds.add(region.id);

        // Immediately pin the region as non-compressible if rule says preserve
        if (rule.action === "preserve") {
          region.compressible = false;
          region.isGovernanceZone = true;
        }
      }
    }

    const criticalCount = violations.filter(v => v.severity === "critical").length;
    const errorCount = violations.filter(v => v.severity === "error").length;
    const warningCount = violations.filter(v => v.severity === "warning").length;

    // Score: starts at 100, deduct per violation severity
    const governanceScore = Math.max(
      0,
      100 - criticalCount * 30 - errorCount * 10 - warningCount * 5
    );

    return {
      violations,
      blockedRegionIds,
      maskedRegionIds,
      preservedRegionIds,
      governanceScore,
      passedValidation: blockedRegionIds.size === 0 && criticalCount === 0,
    };
  }
}
