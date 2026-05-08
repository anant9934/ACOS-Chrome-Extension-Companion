import { getEncoding } from "js-tiktoken";

/**
 * Token calculation logic using js-tiktoken (Pure JS, safe for Chrome Extensions).
 */
export function estimateTokens(text: string): number {
  try {
    const encoding = getEncoding("cl100k_base");
    const tokens = encoding.encode(text);
    return tokens.length;
  } catch (error) {
    console.error("Token estimation failed:", error);
    // Fallback: roughly 4 chars per token
    return Math.ceil(text.length / 4);
  }
}
