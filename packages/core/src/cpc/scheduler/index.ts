import { ContextSlice, OptimizedContext } from "../types";

export class TokenScheduler {
  private budget: number;
  private used: number = 0;

  constructor(budget: number) {
    this.budget = budget;
  }

  allocate(slices: ContextSlice[]): OptimizedContext {
    const result: OptimizedContext = {
      critical: [],
      important: [],
      supplemental: []
    };

    // Sort by priority (descending)
    const sorted = [...slices].sort((a, b) => b.priority - a.priority);

    for (const slice of sorted) {
      if (this.used + slice.tokens > this.budget) {
        // Budget exceeded, decide whether to compress or exclude
        if (slice.priority >= 80) {
          // Critical items should be included even if slightly over, or we should compress others
          // For MVP, we just cap it
          continue;
        }
        continue;
      }

      this.used += slice.tokens;

      if (slice.priority >= 90) {
        result.critical.push(slice);
      } else if (slice.priority >= 60) {
        result.important.push(slice);
      } else {
        result.supplemental.push(slice);
      }
    }

    return result;
  }

  getAvailableBudget(): number {
    return this.budget - this.used;
  }
}
