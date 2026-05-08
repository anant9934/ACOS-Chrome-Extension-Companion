// Shim for libraries that expect 'window' to be defined (e.g., graphlib/lodash fallback)
if (typeof window === "undefined") {
  (globalThis as any).window = globalThis;
}

import { AutonomousContextOperatingSystem, estimateTokens } from "@repo/core"
import { storage, INITIAL_ANALYTICS, type AnalyticsData } from "~state"

const acos = new AutonomousContextOperatingSystem()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_RELEVANCE") {
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
      taskMode: "debugging"
    }).then(result => {
      sendResponse(result)
    })
    return true
  }

  if (request.type === "RECORD_ANALYTICS") {
    const { originalTokens, optimizedTokens, site, model } = request.data
    const saved = originalTokens - optimizedTokens
    
    storage.get<AnalyticsData>("acos-analytics").then(data => {
      const current = data || INITIAL_ANALYTICS
      storage.set("acos-analytics", {
        totalTokensSaved: current.totalTokensSaved + saved,
        optimizationsCount: current.optimizationsCount + 1,
        history: [{ timestamp: Date.now(), saved, site, model }, ...current.history].slice(0, 100)
      })
    })
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
