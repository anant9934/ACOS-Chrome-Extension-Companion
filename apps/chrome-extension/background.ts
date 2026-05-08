import { AutonomousContextOperatingSystem, estimateTokens } from "@repo/core"

const acos = new AutonomousContextOperatingSystem()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_RELEVANCE") {
    // Basic ACOS orchestration for web prompts
    // We assume 'gpt-4o' as default for ChatGPT, etc.
    const model = inferModel(sender.tab?.url || "")
    
    acos.orchestrate({
      cpcPacket: {
        task: request.input.prompt,
        optimizedContext: { critical: [], important: [], supplemental: [] },
        excluded: [],
        semanticSummaries: [],
        estimatedTokens: estimateTokens(request.input.prompt),
        compressionRatio: 1,
        hallucinationRisk: { score: "low", factors: [], recommendations: [] },
        reasoning: []
      },
      targetModel: model,
      taskMode: "debugging" // Default
    }).then(result => {
      sendResponse(result)
    })
    return true
  }
  return true
})

function inferModel(url: string): string {
  if (url.includes("openai")) return "gpt-4o"
  if (url.includes("claude")) return "claude-3-sonnet"
  if (url.includes("gemini")) return "gemini-1.5-pro"
  return "gpt-4o"
}

console.log("ACOS Universal Companion Background Worker Initialized")
