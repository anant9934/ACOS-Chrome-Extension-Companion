/**
 * Basic text compression and prompt optimization logic.
 */

const STOP_WORDS = [
  "please", "can", "you", "help", "me", "with", "i", "am", "having", "an", "issue", "where",
  "could", "would", "basically", "actually", "just", "really", "very", "so", "kind", "of"
];

export function compressText(text: string): string {
  // 1. Stop-word removal (basic heuristic)
  let compressed = text.split(/\s+/).filter(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
    return !STOP_WORDS.includes(cleanWord);
  }).join(" ");

  // 2. Semantic Deduplication (remove repeated lines)
  const lines = compressed.split("\n");
  const uniqueLines = Array.from(new Set(lines.map(l => l.trim()))).filter(l => l.length > 0);
  
  return uniqueLines.join("\n");
}

export function optimizePrompt(text: string, context?: string): string {
  return `Task: Process input
Intent: Optimized interaction
Context: ${context || "Not provided"}
Content:
${text}`;
}
