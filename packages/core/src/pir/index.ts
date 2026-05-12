/**
 * EPOG-M: Prompt Intermediate Representation (PIR) Compiler
 *
 * Converts a raw prompt string into a structured semantic tree of PromptRegions.
 * Each region is typed, prioritized, and annotated with governance flags.
 *
 * This is the foundation of the optimization pipeline — all downstream stages
 * operate on the PIR, not on raw text.
 *
 * Design: deterministic, stateless, no external calls.
 */

import { estimateTokens } from "../tokens";

export type RegionType =
  | "instruction"   // Imperative directives ("Fix this", "Refactor", "Explain")
  | "code"          // Fenced code blocks or inline monospace content
  | "context"       // Background/environmental information
  | "constraint"    // Explicit rules ("Don't use external libs", "Must return JSON")
  | "question"      // Interrogative sentences ("How does X work?")
  | "example"       // Demonstration content ("For example: ...")
  | "compliance"    // Legal/policy/contractual language
  | "metadata"      // Structural scaffolding (headers, separators, labels)
  | "filler";       // Conversational padding with no semantic value

export interface RegionFlag {
  key: string;
  value?: string;
}

export interface PromptRegion {
  id: string;
  type: RegionType;
  content: string;
  tokens: number;
  /** Regions this region directly depends on (by ID). Must be included if this is included. */
  dependsOn: string[];
  /** Whether downstream compression engines may modify this region. */
  compressible: boolean;
  /**
   * Governance zones are flagged by policy rules and pinned as non-compressible,
   * non-removable by the compression stage.
   */
  isGovernanceZone: boolean;
  /** Semantic priority 0-100. Higher = more important to preserve. */
  priority: number;
  /** Structural flags used by governance/risk engines. */
  flags: RegionFlag[];
}

export interface PromptIR {
  /** Stable session-scoped ID for replay and ledger correlation. */
  id: string;
  regions: PromptRegion[];
  totalTokens: number;
  detectedLanguage: string;
  /** The intent label resolved at compile time. */
  resolvedIntent: string;
}

// ─── Regex Helpers ────────────────────────────────────────────────────────────

const FENCED_CODE_BLOCK = /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\1\s*$/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const COMPLIANCE_KEYWORDS =
  /\b(gdpr|hipaa|sox|pci.dss|compliance|legal|warrant|liability|indemnif|copyright|proprietary|confidential|non.disclosure|nda|trade.secret|terms.of.service|privacy.policy)\b/i;
const CONSTRAINT_KEYWORDS =
  /\b(must|should not|do not|never|always|required|forbidden|mandatory|ensure|guarantee|restrict|only use|avoid)\b/i;
const QUESTION_PATTERN = /^.{5,}\?$/m;
const EXAMPLE_KEYWORDS =
  /\b(for example|e\.g\.|for instance|such as|like|sample output|expected output|input:?|output:?)\b/i;
const HAS_API_SIGNATURE =
  /\b(?:function|def |class |interface |type |const [A-Z]|export (?:function|class|interface|type|const))\b/;
const HAS_IMPORT = /\b(?:import |require\(|from ["'])/;
const HAS_SECRET_HINT =
  /\b(?:api[_-]?key|apikey|secret|password|token|credential|bearer|authorization)\s*[=:]/i;
const EXCESSIVE_WHITESPACE = /\n{3,}/g;

// Filler phrases — highly specific, ordered by length (longest first to prevent partial matches)
const FILLER_PHRASES = [
  "i was wondering if you could",
  "i hope you don't mind me asking",
  "could you please help me",
  "i would like you to",
  "would you be able to",
  "could you kindly",
  "please help me",
  "can you please",
  "i need help with",
  "i'm having an issue",
  "i am having an issue",
  "basically",
  "actually",
  "just",
  "really",
  "kind of",
  "sort of",
];

// ─── ID Generator ─────────────────────────────────────────────────────────────

let _regionCounter = 0;
function nextRegionId(): string {
  return `r${(++_regionCounter).toString().padStart(4, "0")}`;
}

// ─── PIR Compiler ─────────────────────────────────────────────────────────────

export class PromptIRCompiler {
  private lastIntent = "general";

  compile(rawPrompt: string, sessionId: string, resolvedIntent = "general"): PromptIR {
    this.lastIntent = resolvedIntent;
    _regionCounter = 0;

    const regions: PromptRegion[] = [];

    // Phase 1: Extract fenced code blocks first (highest structural priority)
    let remainder = rawPrompt;
    const codeBlockMatches = this.extractCodeBlocks(rawPrompt);
    const placeholders = new Map<string, string>();

    for (const cb of codeBlockMatches) {
      const placeholder = `__CODEBLOCK_${cb.id}__`;
      placeholders.set(placeholder, cb.raw);
      remainder = remainder.replace(cb.raw, placeholder);
      regions.push(this.buildCodeRegion(cb));
    }

    // Phase 2: Segment remainder into logical blocks by double newlines
    const textBlocks = remainder
      .split(/\n{2,}/)
      .map(b => b.trim())
      .filter(b => b.length > 0 && !b.startsWith("__CODEBLOCK_"));

    for (const block of textBlocks) {
      regions.push(this.classifyTextBlock(block));
    }

    // Phase 3: Resolve dependencies (code blocks referencing prior regions)
    this.resolveDependencies(regions);

    // Phase 4: Apply governance zones
    this.applyGovernanceFlags(regions);

    const totalTokens = regions.reduce((sum, r) => sum + r.tokens, 0);

    return {
      id: sessionId,
      regions,
      totalTokens,
      detectedLanguage: this.detectLanguage(rawPrompt),
      resolvedIntent,
    };
  }

  // ─── Extraction ─────────────────────────────────────────────────────────────

  private extractCodeBlocks(text: string): Array<{ id: string; raw: string; lang: string; body: string }> {
    const result: Array<{ id: string; raw: string; lang: string; body: string }> = [];
    const regex = /(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\1/gm;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      result.push({
        id: `cb${result.length + 1}`,
        raw: match[0],
        lang: (match[2] ?? "").trim().toLowerCase(),
        body: match[3] ?? "",
      });
    }
    return result;
  }

  private buildCodeRegion(cb: { id: string; raw: string; lang: string; body: string }): PromptRegion {
    const flags: RegionFlag[] = [{ key: "lang", value: cb.lang }];
    if (HAS_API_SIGNATURE.test(cb.body)) flags.push({ key: "has-api-signature" });
    if (HAS_IMPORT.test(cb.body)) flags.push({ key: "has-import" });
    if (HAS_SECRET_HINT.test(cb.body)) flags.push({ key: "has-secret-hint" });

    const hasApiOrImport = flags.some(f => f.key === "has-api-signature" || f.key === "has-import");

    return {
      id: nextRegionId(),
      type: "code",
      content: cb.raw,
      tokens: estimateTokens(cb.raw),
      dependsOn: [],
      compressible: !hasApiOrImport, // Don't compress API signatures
      isGovernanceZone: false,
      priority: hasApiOrImport ? 95 : 75,
      flags,
    };
  }

  // ─── Text Block Classification ───────────────────────────────────────────────

  private classifyTextBlock(block: string): PromptRegion {
    const lower = block.toLowerCase();
    const flags: RegionFlag[] = [];
    let type: RegionType = "context";
    let priority = 50;
    let compressible = true;

    // Order matters: compliance > constraint > instruction > question > example > filler > context
    if (COMPLIANCE_KEYWORDS.test(lower)) {
      type = "compliance";
      priority = 100;
      compressible = false;
      flags.push({ key: "compliance-language" });
    } else if (CONSTRAINT_KEYWORDS.test(lower)) {
      type = "constraint";
      priority = 90;
      compressible = false;
      flags.push({ key: "has-constraint" });
    } else if (this.isInstruction(lower)) {
      type = "instruction";
      priority = 85;
      compressible = true;
    } else if (QUESTION_PATTERN.test(block)) {
      type = "question";
      priority = 80;
      compressible = true;
    } else if (EXAMPLE_KEYWORDS.test(lower)) {
      type = "example";
      priority = 55;
      compressible = true;
      flags.push({ key: "example-block" });
    } else if (this.isFillerBlock(lower)) {
      type = "filler";
      priority = 0;
      compressible = true;
      flags.push({ key: "filler" });
    } else {
      type = "context";
      priority = 45;
      compressible = true;
    }

    if (HAS_SECRET_HINT.test(lower)) flags.push({ key: "has-secret-hint" });
    if (block.length < 30) flags.push({ key: "short-block" });

    return {
      id: nextRegionId(),
      type,
      content: block,
      tokens: estimateTokens(block),
      dependsOn: [],
      compressible,
      isGovernanceZone: type === "compliance",
      priority,
      flags,
    };
  }

  private isInstruction(lower: string): boolean {
    const verbs = ["fix", "refactor", "implement", "create", "write", "add", "remove", "update",
      "change", "make", "build", "generate", "convert", "migrate", "review", "explain",
      "analyze", "optimize", "debug", "rewrite", "test", "document"];
    return verbs.some(v => lower.startsWith(v) || lower.startsWith(`please ${v}`) || lower.includes(`can you ${v}`));
  }

  private isFillerBlock(lower: string): boolean {
    const cleaned = lower.trim();
    return FILLER_PHRASES.some(p => cleaned === p || cleaned.startsWith(p + " ") || cleaned.startsWith(p + ","));
  }

  // ─── Dependency Resolution ──────────────────────────────────────────────────

  private resolveDependencies(regions: PromptRegion[]): void {
    // Code blocks depend on the instruction/context regions that appear before them
    for (let i = 0; i < regions.length; i++) {
      const current = regions[i];
      if (!current) continue;

      if (current.type === "code") {
        for (let j = i - 1; j >= 0; j--) {
          const prev = regions[j];
          if (!prev) continue;
          if (prev.type === "instruction" || prev.type === "constraint") {
            current.dependsOn.push(prev.id);
            break;
          }
        }
      }

      // Constraints and questions depend on any preceding context
      if (current.type === "constraint" || current.type === "question") {
        for (let j = i - 1; j >= 0; j--) {
          const prev = regions[j];
          if (!prev) continue;
          if (prev.type === "context" || prev.type === "instruction") {
            current.dependsOn.push(prev.id);
            break;
          }
        }
      }
    }
  }

  // ─── Governance Flags ───────────────────────────────────────────────────────

  private applyGovernanceFlags(regions: PromptRegion[]): void {
    for (const region of regions) {
      // Any region with a dependency on a compliance zone is itself a governance zone
      const dependsOnCompliance = region.dependsOn.some(depId =>
        regions.find(r => r.id === depId)?.isGovernanceZone
      );
      if (dependsOnCompliance) {
        region.isGovernanceZone = true;
        region.compressible = false;
      }

      // Pin governance zones to max priority
      if (region.isGovernanceZone) {
        region.priority = 100;
      }
    }
  }

  // ─── Language Detection ─────────────────────────────────────────────────────

  private detectLanguage(text: string): string {
    if (/\btsx?\b/.test(text) || /\bReact\b/.test(text)) return "TypeScript/TSX";
    if (/\bpython\b/i.test(text) || /\bdef \w+\(/.test(text)) return "Python";
    if (/\bjava\b/i.test(text) && /\bclass \w+/.test(text)) return "Java";
    if (/\bruby\b/i.test(text) || /\.rb\b/.test(text)) return "Ruby";
    if (/\bgo\b/i.test(text) && /\bfunc \w+/.test(text)) return "Go";
    if (/\brust\b/i.test(text) || /\bfn \w+/.test(text)) return "Rust";
    return "general";
  }
}
