import { get_encoding } from "@dqbd/tiktoken";

/**
 * Token calculation logic using tiktoken.
 */
export function estimateTokens(text: string): number {
  try {
    const encoding = get_encoding("cl100k_base");
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free();
    return count;
  } catch (error) {
    console.error("Token estimation failed:", error);
    // Fallback: roughly 4 chars per token
    return Math.ceil(text.length / 4);
  }
}
