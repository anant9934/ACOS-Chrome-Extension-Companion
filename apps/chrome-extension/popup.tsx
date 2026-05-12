import { useState } from "react"
import { useACOSAnalytics, useACOSPreferences } from "./state"
import "./style.css"

const MODEL_OPTIONS = [
  { value: "gpt-4o",           label: "GPT-4o",           icon: "⚡" },
  { value: "claude-3-sonnet",  label: "Claude Sonnet",    icon: "🧠" },
  { value: "gemini-1.5-pro",   label: "Gemini 1.5 Pro",   icon: "✦" },
  { value: "ollama-llama3",    label: "Llama 3 (Local)",  icon: "🦙" },
]

const GOV_OPTIONS: Array<{ value: "standard" | "strict" | "enterprise"; label: string; desc: string }> = [
  { value: "standard",   label: "Standard",   desc: "Smart defaults" },
  { value: "strict",     label: "Strict",     desc: "Conservative compression" },
  { value: "enterprise", label: "Enterprise", desc: "Full audit mode" },
]

export default function IndexPopup() {
  const { data: analytics } = useACOSAnalytics()
  const { preferredModel, setPreferredModel, autoOptimize, setAutoOptimize, governanceLevel, setGovernanceLevel } = useACOSPreferences()
  const [copied, setCopied] = useState(false)

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
        window.close()
      }
    })
  }

  return (
    <div style={{ width: 300, minHeight: 380, background: "#09090b", color: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "0" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#18181b,#1c1917)", padding: "18px 20px 14px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 900, boxShadow: "0 0 16px rgba(124,58,237,.4)"
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-.02em" }}>EPOG-M</div>
              <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Prompt Middleware</div>
            </div>
          </div>
          <button
            onClick={openSidePanel}
            style={{ background: "#27272a", border: "none", color: "#a1a1aa", padding: "5px 10px", borderRadius: 7, fontSize: 10, cursor: "pointer", fontWeight: 700 }}
          >Dashboard →</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#27272a", borderBottom: "1px solid #27272a" }}>
        {[
          { label: "Tokens Saved", value: analytics.totalTokensSaved.toLocaleString() },
          { label: "Sessions", value: analytics.optimizationsCount.toString() },
          { label: "Avg Reduction", value: `${analytics.avgReductionPercent}%` },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#09090b", padding: "12px 0", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#a78bfa" }}>{stat.value}</div>
            <div style={{ fontSize: 9, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Model selector */}
        <div>
          <div style={{ fontSize: 10, color: "#71717a", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Target Model</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {MODEL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPreferredModel(opt.value)}
                style={{
                  padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${preferredModel === opt.value ? "#6366f1" : "#27272a"}`,
                  background: preferredModel === opt.value ? "rgba(99,102,241,.12)" : "#18181b",
                  color: preferredModel === opt.value ? "#a5b4fc" : "#71717a",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5, textAlign: "left",
                  transition: "all .15s"
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Governance level */}
        <div>
          <div style={{ fontSize: 10, color: "#71717a", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Governance Mode</div>
          <div style={{ display: "flex", gap: 6 }}>
            {GOV_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGovernanceLevel(opt.value)}
                title={opt.desc}
                style={{
                  flex: 1, padding: "7px 6px", borderRadius: 8,
                  border: `1px solid ${governanceLevel === opt.value ? "#10b981" : "#27272a"}`,
                  background: governanceLevel === opt.value ? "rgba(16,185,129,.1)" : "#18181b",
                  color: governanceLevel === opt.value ? "#34d399" : "#71717a",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                  transition: "all .15s"
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-optimize toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#18181b", borderRadius: 10, padding: "10px 14px", border: "1px solid #27272a" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>Auto-Optimize</div>
            <div style={{ fontSize: 10, color: "#52525b" }}>Optimize on send key</div>
          </div>
          <div
            onClick={() => setAutoOptimize(!autoOptimize)}
            style={{
              width: 38, height: 22, borderRadius: 99,
              background: autoOptimize ? "#6366f1" : "#27272a",
              cursor: "pointer", position: "relative", transition: "background .2s"
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: autoOptimize ? 19 : 3,
              width: 16, height: 16, borderRadius: 99,
              background: "#fff", transition: "left .2s"
            }} />
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <div style={{ width: 7, height: 7, background: "#10b981", borderRadius: "50%", boxShadow: "0 0 8px rgba(16,185,129,.6)" }} />
          <span style={{ fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Pipeline Active · Local Engine</span>
        </div>
      </div>
    </div>
  )
}
