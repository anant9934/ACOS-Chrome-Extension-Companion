import { useState } from "react"
import { useACOSAnalytics, useAuditLog, useACOSPreferences, type AuditEntry } from "./state"
import { Onboarding } from "./components/Onboarding"
import "./style.css"

type View = "dashboard" | "audit" | "replay"

const RISK_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
}

function ScoreRing({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
        <text x="26" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{value}</text>
      </svg>
      <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
    </div>
  )
}

function PipelineStageRow({ stage, tokenDelta, rationale }: { stage: string; tokenDelta: number; rationale: string }) {
  const [open, setOpen] = useState(false)
  const saved = -tokenDelta
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        padding: "8px 12px", borderRadius: 8,
        background: "#0f172a", border: "1px solid #1e293b",
        cursor: "pointer", transition: "border-color .15s"
      }}
      onMouseOver={e => (e.currentTarget.style.borderColor = "#334155")}
      onMouseOut={e => (e.currentTarget.style.borderColor = "#1e293b")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", fontFamily: "monospace" }}>{stage}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: saved > 0 ? "#10b981" : saved < 0 ? "#ef4444" : "#64748b" }}>
          {saved > 0 ? `-${saved}` : saved < 0 ? `+${-saved}` : "±0"} tk
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
          {rationale}
        </div>
      )}
    </div>
  )
}

function AuditCard({ entry, onReplay }: { entry: AuditEntry; onReplay: (e: AuditEntry) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 14px", background: "#0f172a", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0", textTransform: "capitalize" }}>{entry.intent}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: RISK_COLOR[entry.hallucinationRisk] ?? "#64748b", textTransform: "uppercase", letterSpacing: ".08em" }}>
              {entry.hallucinationRisk} risk
            </span>
            {entry.piiDetected && (
              <span style={{ fontSize: 9, background: "rgba(239,68,68,.1)", color: "#f87171", border: "1px solid rgba(239,68,68,.2)", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>
                PII masked
              </span>
            )}
          </div>
          <span style={{ fontSize: 9, color: "#475569" }}>
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#a78bfa" }}>-{entry.reductionPercent}%</div>
          <div style={{ fontSize: 9, color: "#475569" }}>{entry.originalTokens}→{entry.optimizedTokens} tk</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "12px 14px", background: "#020617", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Score rings */}
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <ScoreRing value={entry.integrityScore} color="#6366f1" label="Integrity" />
            <ScoreRing value={entry.governanceScore} color="#10b981" label="Governance" />
            <ScoreRing value={entry.isSafeToSubmit ? 100 : 0} color={entry.isSafeToSubmit ? "#10b981" : "#ef4444"} label="Safe" />
          </div>

          {/* Warnings */}
          {entry.warnings.length > 0 && (
            <div style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: "8px 10px" }}>
              {entry.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10, color: "#fbbf24", lineHeight: 1.5 }}>{w}</div>
              ))}
            </div>
          )}

          {/* Stages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>Pipeline Stages</div>
            {entry.stages.map((s, i) => (
              <PipelineStageRow key={i} stage={s.stage} tokenDelta={s.tokenDelta} rationale={s.rationale} />
            ))}
          </div>

          <button
            onClick={() => onReplay(entry)}
            style={{
              width: "100%", padding: "8px", borderRadius: 8,
              background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)",
              color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer"
            }}
          >
            ↩ Replay Session
          </button>
        </div>
      )}
    </div>
  )
}

function Dashboard() {
  const { data: analytics } = useACOSAnalytics()
  const { preferredModel } = useACOSPreferences()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero stats */}
      <section style={{ padding: "20px", borderRadius: 16, background: "linear-gradient(135deg,#0f172a,#020617)", border: "1px solid #1e293b", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: "rgba(99,102,241,.15)", borderRadius: "50%", filter: "blur(30px)" }} />
        <div style={{ textAlign: "center", position: "relative" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: ".2em", marginBottom: 6 }}>Lifetime Token Savings</div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-.03em", background: "linear-gradient(to bottom,#f8fafc,#64748b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {analytics.totalTokensSaved.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>tokens optimized</div>
        </div>
      </section>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Sessions", value: analytics.optimizationsCount, color: "#a78bfa" },
          { label: "Avg Reduction", value: `${analytics.avgReductionPercent}%`, color: "#34d399" },
          { label: "Avg Governance", value: `${analytics.avgGovernanceScore}/100`, color: "#60a5fa" },
          { label: "Target Model", value: preferredModel.split("-")[0] ?? "gpt-4o", color: "#fb923c" },
        ].map(m => (
          <div key={m.label} style={{ padding: "12px 14px", borderRadius: 12, background: "#0f172a", border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Cognitive status */}
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>System Status</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.15)" }}>
          <div style={{ width: 2, background: "#10b981", borderRadius: 4, animation: "pulse 2s infinite" }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 2 }}>Hallucination Shield Active</div>
            <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5 }}>Pipeline monitoring prompt entropy. All 10 stages operational.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,.05)", border: "1px solid rgba(99,102,241,.15)" }}>
          <div style={{ width: 2, background: "#6366f1", borderRadius: 4 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginBottom: 2 }}>Governance Engine</div>
            <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.5 }}>8 built-in policy rules enforced. PII scanning active.</div>
          </div>
        </div>
      </section>

      {/* Recent history */}
      {analytics.history.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Recent Sessions</div>
          {analytics.history.slice(0, 3).map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", textTransform: "capitalize" }}>{entry.site}</div>
                <div style={{ fontSize: 9, color: "#475569" }}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#34d399" }}>-{entry.reductionPercent}%</div>
                <div style={{ fontSize: 9, color: "#475569" }}>+{entry.saved} tk saved</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function AuditLog() {
  const { entries } = useAuditLog()
  const [replayEntry, setReplayEntry] = useState<AuditEntry | null>(null)

  if (replayEntry) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setReplayEntry(null)}
            style={{ background: "#1e293b", border: "none", color: "#94a3b8", padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
          >← Back</button>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>Session Replay</span>
        </div>

        <div style={{ padding: "14px", background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Transformation Chain · {replayEntry.sessionId}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {replayEntry.stages.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: s.tokenDelta < 0 ? "rgba(16,185,129,.15)" : "#1e293b", border: `1px solid ${s.tokenDelta < 0 ? "#10b981" : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: s.tokenDelta < 0 ? "#10b981" : "#64748b", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  {i < replayEntry.stages.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: "#1e293b" }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", fontFamily: "monospace" }}>{s.stage}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: s.tokenDelta < 0 ? "#10b981" : "#64748b" }}>
                      {s.tokenDelta < 0 ? `${s.tokenDelta} tk` : "no change"}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4, marginTop: 2 }}>{s.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>No audit entries yet</div>
        <div style={{ fontSize: 11 }}>Use the Optimize button on any AI platform to begin.</div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(entry => (
        <AuditCard key={entry.sessionId} entry={entry} onReplay={setReplayEntry} />
      ))}
    </div>
  )
}

export default function SidePanel() {
  const [view, setView] = useState<View>("dashboard")
  const { onboardingCompleted } = useACOSPreferences()

  if (!onboardingCompleted) return <Onboarding />

  const NAV: Array<{ id: View; label: string; icon: string }> = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "audit",     label: "Audit Log", icon: "📋" },
  ]

  return (
    <div style={{ width: "100%", height: "100vh", background: "#09090b", color: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <header style={{ padding: "16px 18px 12px", borderBottom: "1px solid #18181b", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, boxShadow: "0 0 14px rgba(124,58,237,.4)" }}>⚡</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: "-.02em", lineHeight: 1 }}>EPOG-M</div>
            <div style={{ fontSize: 8, color: "#6366f1", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>Enterprise Middleware</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", boxShadow: "0 0 8px rgba(16,185,129,.6)" }} />
          <span style={{ fontSize: 9, color: "#475569", fontWeight: 700 }}>v1.0.0</span>
        </div>
      </header>

      {/* Nav tabs */}
      <div style={{ display: "flex", padding: "10px 18px 0", gap: 4, flexShrink: 0 }}>
        {NAV.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding: "7px 14px", borderRadius: "8px 8px 0 0",
              border: "1px solid",
              borderBottom: "none",
              borderColor: view === tab.id ? "#27272a" : "transparent",
              background: view === tab.id ? "#18181b" : "transparent",
              color: view === tab.id ? "#e4e4e7" : "#52525b",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 24px", borderTop: "1px solid #27272a" }}>
        {view === "dashboard" ? <Dashboard /> : <AuditLog />}
      </div>
    </div>
  )
}
