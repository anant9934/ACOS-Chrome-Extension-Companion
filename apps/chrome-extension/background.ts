import "./shim"
import { epogOrchestrator, type EPOGInput } from "@repo/core"
import { storage, INITIAL_ANALYTICS, type AnalyticsData, type AuditEntry } from "~state"

// ─── Message Types ────────────────────────────────────────────────────────────

interface EPOGOptimizeMessage {
  type: "EPOG_OPTIMIZE"
  payload: {
    prompt: string
    model: string
    sessionId: string
  }
}

interface RecordAnalyticsMessage {
  type: "RECORD_ANALYTICS"
  data: {
    originalTokens: number
    optimizedTokens: number
    reductionPercent: number
    site: string
    model: string
    governanceScore?: number
  }
}

interface GetAuditLogMessage {
  type: "GET_AUDIT_LOG"
}

interface GetStatsMessage {
  type: "GET_STATS"
}

type IncomingMessage =
  | EPOGOptimizeMessage
  | RecordAnalyticsMessage
  | GetAuditLogMessage
  | GetStatsMessage

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request: IncomingMessage, sender, sendResponse) => {

  // ── EPOG Optimization Pipeline ───────────────────────────────────────────────
  if (request.type === "EPOG_OPTIMIZE") {
    const { prompt, model, sessionId } = request.payload
    const input: EPOGInput = { prompt, targetModel: model, sessionId }

    epogOrchestrator
      .optimize(input)
      .then(async (output) => {
        // Persist transformation record to storage for audit replay
        try {
          const existing = await storage.get<AuditEntry[]>("epog-audit-log") ?? []
          const entry: AuditEntry = {
            sessionId: output.sessionId,
            timestamp: Date.now(),
            originalTokens: output.originalTokens,
            optimizedTokens: output.optimizedTokens,
            reductionPercent: output.reductionPercent,
            intent: output.intent,
            hallucinationRisk: output.hallucinationRisk,
            integrityScore: output.integrityScore,
            governanceScore: output.governanceScore,
            isSafeToSubmit: output.isSafeToSubmit,
            piiDetected: output.piiDetected,
            warnings: output.warnings,
            stages: output.pipelineStages,
          }
          const updated = [entry, ...existing].slice(0, 200)
          await storage.set("epog-audit-log", updated)
        } catch { /* Non-critical — don't fail the optimization */ }

        sendResponse({ success: true, output })
      })
      .catch((err) => {
        console.error("[EPOG-M] Pipeline error:", err)
        sendResponse({ success: false, error: String(err) })
      })

    return true // Keep channel open for async response
  }

  // ── Analytics Recording ──────────────────────────────────────────────────────
  if (request.type === "RECORD_ANALYTICS") {
    const { originalTokens, optimizedTokens, site, model, reductionPercent, governanceScore } = request.data
    const saved = originalTokens - optimizedTokens

    storage.get<AnalyticsData>("acos-analytics").then(data => {
      const current = data ?? INITIAL_ANALYTICS
      const updated: AnalyticsData = {
        totalTokensSaved: current.totalTokensSaved + saved,
        optimizationsCount: current.optimizationsCount + 1,
        avgReductionPercent: Math.round(
          (current.avgReductionPercent * current.optimizationsCount + (reductionPercent ?? 0)) /
          (current.optimizationsCount + 1)
        ),
        avgGovernanceScore: Math.round(
          (current.avgGovernanceScore * current.optimizationsCount + (governanceScore ?? 100)) /
          (current.optimizationsCount + 1)
        ),
        history: [
          {
            timestamp: Date.now(),
            saved,
            reductionPercent: reductionPercent ?? 0,
            site,
            model,
          },
          ...current.history
        ].slice(0, 200),
      }
      storage.set("acos-analytics", updated)
    })

    return false
  }

  // ── Audit Log Retrieval ──────────────────────────────────────────────────────
  if (request.type === "GET_AUDIT_LOG") {
    storage.get<AuditEntry[]>("epog-audit-log").then(entries => {
      sendResponse({ entries: entries ?? [] })
    })
    return true
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  if (request.type === "GET_STATS") {
    const ledgerStats = epogOrchestrator.ledgerStore.getStats()
    sendResponse({ stats: ledgerStats })
    return true
  }

  return false
})

console.log("[EPOG-M] Background service worker initialized v1.0.0")
