/**
 * EPOG-M: Transformation Ledger
 *
 * Immutable, append-only audit trail of every optimization step applied to a prompt.
 * Each entry includes: stage name, token delta, rationale, and a determinism hash.
 *
 * The hash allows independent verification that the same input always produces
 * the same transformation chain — the core of the determinism guarantee.
 *
 * Storage: kept in-memory for the session, persisted to chrome.storage.local via
 * the background worker on every completion.
 */

export interface LedgerEntry {
  /** Sequential step number within this session (1-indexed). */
  step: number;
  /** Pipeline stage identifier. */
  stage: string;
  /** Human-readable description of what was done. */
  rationale: string;
  /** Token count before this step. */
  tokensBefore: number;
  /** Token count after this step. */
  tokensAfter: number;
  /** Net change (negative = reduction). */
  tokenDelta: number;
  /** Regions affected (IDs). */
  affectedRegions: string[];
  /** Determinism verification hash (djb2 of stage + rationale + tokensBefore). */
  deterministicHash: string;
  /** Wall-clock timestamp (ms since epoch). */
  timestamp: number;
}

export interface TransformationRecord {
  /** Unique session identifier. */
  sessionId: string;
  /** ISO timestamp string when the session started. */
  startedAt: string;
  /** ISO timestamp string when the session completed. */
  completedAt?: string;
  /** The original user prompt (before any processing). */
  originalPrompt: string;
  /** The final optimized prompt (after all stages). */
  optimizedPrompt?: string;
  /** Total tokens in original prompt. */
  originalTokens: number;
  /** Total tokens in final optimized prompt. */
  finalTokens?: number;
  /** Percentage reduction (0–100). */
  reductionPercent?: number;
  /** Ordered list of transformation steps. */
  entries: LedgerEntry[];
  /** Whether this record can be replayed deterministically. */
  isReplayable: boolean;
  /** Model target at time of optimization. */
  targetModel: string;
  /** Governance score at time of completion (0–100). */
  governanceScore?: number;
}

// ─── djb2 hash ───────────────────────────────────────────────────────────────

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // Keep as unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export class TransformationLedger {
  private record: TransformationRecord;
  private stepCounter = 0;

  constructor(sessionId: string, originalPrompt: string, originalTokens: number, targetModel: string) {
    this.record = {
      sessionId,
      startedAt: new Date().toISOString(),
      originalPrompt,
      originalTokens,
      entries: [],
      isReplayable: true,
      targetModel,
    };
  }

  /** Append a step to the immutable ledger. Returns the created entry. */
  record_step(params: {
    stage: string;
    rationale: string;
    tokensBefore: number;
    tokensAfter: number;
    affectedRegions?: string[];
  }): LedgerEntry {
    this.stepCounter++;
    const entry: LedgerEntry = {
      step: this.stepCounter,
      stage: params.stage,
      rationale: params.rationale,
      tokensBefore: params.tokensBefore,
      tokensAfter: params.tokensAfter,
      tokenDelta: params.tokensAfter - params.tokensBefore,
      affectedRegions: params.affectedRegions ?? [],
      deterministicHash: djb2Hash(`${params.stage}|${params.rationale}|${params.tokensBefore}`),
      timestamp: Date.now(),
    };
    this.record.entries.push(entry);
    return entry;
  }

  /** Seal the ledger — call once the final prompt is assembled. */
  seal(optimizedPrompt: string, finalTokens: number, governanceScore?: number): TransformationRecord {
    this.record.optimizedPrompt = optimizedPrompt;
    this.record.finalTokens = finalTokens;
    this.record.completedAt = new Date().toISOString();
    this.record.governanceScore = governanceScore;
    this.record.reductionPercent = this.record.originalTokens > 0
      ? Math.round(((this.record.originalTokens - finalTokens) / this.record.originalTokens) * 100)
      : 0;
    return { ...this.record, entries: [...this.record.entries] };
  }

  getRecord(): TransformationRecord {
    return { ...this.record, entries: [...this.record.entries] };
  }

  /** Verify a record's chain integrity by re-hashing each entry. */
  static verify(record: TransformationRecord): { valid: boolean; brokenSteps: number[] } {
    const brokenSteps: number[] = [];
    for (const entry of record.entries) {
      const expected = djb2Hash(`${entry.stage}|${entry.rationale}|${entry.tokensBefore}`);
      if (expected !== entry.deterministicHash) {
        brokenSteps.push(entry.step);
      }
    }
    return { valid: brokenSteps.length === 0, brokenSteps };
  }
}

/** In-memory session store — kept in the background worker's lifecycle. */
export class LedgerStore {
  private records = new Map<string, TransformationRecord>();
  private readonly MAX_RECORDS = 100;

  save(record: TransformationRecord): void {
    this.records.set(record.sessionId, record);
    // Evict oldest if over limit
    if (this.records.size > this.MAX_RECORDS) {
      const oldest = this.records.keys().next().value;
      if (oldest) this.records.delete(oldest);
    }
  }

  get(sessionId: string): TransformationRecord | undefined {
    return this.records.get(sessionId);
  }

  getAll(): TransformationRecord[] {
    return Array.from(this.records.values()).reverse(); // Newest first
  }

  getStats(): { totalSessions: number; totalTokensSaved: number; avgReductionPercent: number } {
    const all = this.getAll();
    const totalTokensSaved = all.reduce((sum, r) => {
      return sum + (r.originalTokens - (r.finalTokens ?? r.originalTokens));
    }, 0);
    const avgReductionPercent = all.length > 0
      ? Math.round(all.reduce((sum, r) => sum + (r.reductionPercent ?? 0), 0) / all.length)
      : 0;
    return { totalSessions: all.length, totalTokensSaved, avgReductionPercent };
  }
}
