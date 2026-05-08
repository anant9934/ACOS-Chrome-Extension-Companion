export interface OptimizationResult {
  originalText: string;
  optimizedText: string;
  originalTokens: number;
  optimizedTokens: number;
  savingsPercentage: number;
}

export interface ProcessingOptions {
  stripComments?: boolean;
  stripLogs?: boolean;
  minifyCode?: boolean;
}
