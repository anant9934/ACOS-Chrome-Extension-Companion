import type { PlasmoCSConfig } from "plasmo"
import { findAdapter } from "~adapters"

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://chat.deepseek.com/*",
    "https://www.perplexity.ai/*",
    "https://cursor.sh/*"
  ]
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface EPOGContentResponse {
  success: boolean
  output?: {
    optimizedPrompt: string
    originalTokens: number
    optimizedTokens: number
    reductionPercent: number
    intent: string
    hallucinationRisk: string
    integrityScore: number
    governanceScore: number
    isSafeToSubmit: boolean
    piiDetected: boolean
    warnings: string[]
    pipelineStages: Array<{ stage: string; tokenDelta: number; rationale: string }>
  }
  error?: string
}

// ─── STATE & HELPERS ─────────────────────────────────────────────────────────

let _analysisCache: EPOGContentResponse["output"] | null = null
let _lastAnalyzedText = ""
let _isOptimizing = false
let _commandPaletteOpen = false

function generateSessionId(): string {
  return `epog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getTextareaValue(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement) return el.value
  if (el.contentEditable === "true") return el.innerText
  return (el as HTMLInputElement).value || ""
}

function setTextareaValue(el: HTMLElement, value: string) {
  if (el instanceof HTMLTextAreaElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    nativeSetter?.call(el, value)
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
  } else if (el.contentEditable === "true") {
    el.innerText = value
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

function inferModelFromURL(adapterName: string): string {
  const map: Record<string, string> = {
    ChatGPT: "gpt-4o",
    Claude: "claude-3-sonnet",
    Gemini: "gemini-1.5-pro",
    DeepSeek: "gpt-4o",
    Perplexity: "gpt-4o",
  }
  return map[adapterName] ?? "gpt-4o"
}

// ─── DEBOUNCED ANALYSIS ──────────────────────────────────────────────────────

let _analysisTimeout: number | null = null

function triggerLiveAnalysis(textarea: HTMLElement, adapterName: string, container: HTMLElement) {
  const currentText = getTextareaValue(textarea).trim()
  if (currentText === _lastAnalyzedText) return
  if (currentText.length < 10) {
    _analysisCache = null
    _lastAnalyzedText = currentText
    updatePassiveIndicator(container, null)
    return
  }

  if (_analysisTimeout) clearTimeout(_analysisTimeout)

  _analysisTimeout = window.setTimeout(() => {
    if (!chrome.runtime?.id) return

    _lastAnalyzedText = currentText
    const sessionId = generateSessionId()

    chrome.runtime.sendMessage(
      {
        type: "EPOG_OPTIMIZE",
        payload: { prompt: currentText, model: inferModelFromURL(adapterName), sessionId }
      },
      (response: EPOGContentResponse | null) => {
        if (chrome.runtime.lastError || !response?.success || !response.output) return
        _analysisCache = response.output
        updatePassiveIndicator(container, response.output)
      }
    )
  }, 400) // Debounce 400ms so it doesn't interrupt typing
}

// ─── UI COMPONENTS (THE 3-LAYER MODEL) ───────────────────────────────────────

function createMiddlewareContainer(): HTMLElement {
  const container = document.createElement("div")
  container.id = "epog-middleware"
  container.style.cssText = [
    "position:absolute",
    "right:44px", // Position it to the left of the mic/upload icons
    "bottom:10px", // Align vertically with the mic icon
    "z-index:9999",
    "display:flex",
    "flex-direction:column",
    "align-items:flex-end",
    "gap:6px",
    "font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    "pointer-events:none"
  ].join(";")
  return container
}

// LAYER 1 & 2: Passive Indicator + Assistive Hover State
function createIndicatorNode(): HTMLElement {
  const node = document.createElement("div")
  node.id = "epog-inline-indicator"
  node.style.cssText = [
    "background:rgba(32,33,35,0.9)", // Native ChatGPT dark mode gray
    "backdrop-filter:blur(10px)",
    "-webkit-backdrop-filter:blur(10px)",
    "border:1px solid rgba(255,255,255,0.1)", // Very subtle border
    "border-radius:16px", // Pill shape
    "padding:4px 10px",
    "color:#ececf1", // Native ChatGPT text color
    "font-size:12px",
    "font-weight:500", // Less bold, more native
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "gap:6px",
    "pointer-events:auto",
    "transition:all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    "box-shadow:0 2px 6px rgba(0,0,0,0.1)", // Softer shadow
    "opacity:0",
    "transform:translateY(4px)",
  ].join(";")

  node.innerHTML = `
    <span class="epog-icon" style="color:#d1d5db;display:flex">✦</span>
    <span class="epog-min-text">Analyzing</span>
    <div class="epog-expanded-details" style="display:none;flex-direction:row;gap:8px;border-left:1px solid rgba(255,255,255,0.2);padding-left:8px;margin-left:2px">
      <div style="font-size:11px;color:#ececf1"><span style="color:#9ca3af">Intent:</span> <span class="epog-intent">...</span></div>
      <div style="font-size:11px;color:#ececf1"><span style="color:#9ca3af">Risk:</span> <span class="epog-risk">...</span></div>
    </div>
  `

  node.addEventListener("mouseenter", () => {
    if (_analysisCache && _analysisCache.reductionPercent > 0) {
      node.style.background = "rgba(52,53,65,0.95)"
      node.style.borderColor = "rgba(255,255,255,0.2)"
      const details = node.querySelector(".epog-expanded-details") as HTMLElement
      details.style.display = "flex"
    }
  })

  node.addEventListener("mouseleave", () => {
    node.style.background = "rgba(32,33,35,0.9)"
    node.style.borderColor = "rgba(255,255,255,0.1)"
    const details = node.querySelector(".epog-expanded-details") as HTMLElement
    details.style.display = "none"
  })

  return node
}

function updatePassiveIndicator(container: HTMLElement, output: EPOGContentResponse["output"] | null) {
  let indicator = container.querySelector("#epog-inline-indicator") as HTMLElement
  if (!indicator) {
    indicator = createIndicatorNode()
    container.appendChild(indicator)
  }

  if (!output) {
    indicator.style.opacity = "0"
    indicator.style.transform = "translateY(4px)"
    return
  }

  indicator.style.opacity = "1"
  indicator.style.transform = "translateY(0)"

  const minText = indicator.querySelector(".epog-min-text") as HTMLElement
  const intentNode = indicator.querySelector(".epog-intent") as HTMLElement
  const riskNode = indicator.querySelector(".epog-risk") as HTMLElement

  if (output.reductionPercent > 5) {
    minText.textContent = `${output.reductionPercent}% reducible`
    minText.style.color = "#a5b4fc"
  } else {
    minText.textContent = "Optimal"
    minText.style.color = "#10b981"
  }

  intentNode.textContent = output.intent.replace("-", " ")
  riskNode.textContent = output.hallucinationRisk.toUpperCase()
  riskNode.style.color = output.hallucinationRisk === "high" ? "#ef4444" : output.hallucinationRisk === "medium" ? "#f59e0b" : "#10b981"

  // If high risk, auto-expand to warn the user
  if (output.hallucinationRisk === "high") {
    indicator.style.borderColor = "#ef4444"
      ; (indicator.querySelector(".epog-expanded-details") as HTMLElement).style.display = "flex"
  }
}

// ─── COMMAND PALETTE (LAYER 3) ───────────────────────────────────────────────

function createCommandPalette(textarea: HTMLElement, adapterName: string) {
  const overlay = document.createElement("div")
  overlay.id = "epog-command-palette"
  overlay.style.cssText = [
    "position:fixed",
    "top:0", "left:0", "width:100vw", "height:100vh",
    "background:rgba(0,0,0,0.6)",
    "backdrop-filter:blur(4px)",
    "-webkit-backdrop-filter:blur(4px)",
    "z-index:999999",
    "display:flex",
    "align-items:flex-start",
    "justify-content:center",
    "padding-top:15vh",
    "opacity:0",
    "pointer-events:none",
    "transition:opacity 0.15s ease"
  ].join(";")

  const palette = document.createElement("div")
  palette.style.cssText = [
    "width:500px",
    "background:#09090b",
    "border:1px solid #27272a",
    "border-radius:16px",
    "box-shadow:0 24px 48px rgba(0,0,0,0.5)",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "transform:scale(0.95)",
    "transition:transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
  ].join(";")

  const inputArea = document.createElement("div")
  inputArea.style.cssText = "padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;gap:12px"
  inputArea.innerHTML = `
    <span style="color:#6366f1;font-size:18px">⚡</span>
    <input type="text" placeholder="Search commands..." style="background:transparent;border:none;outline:none;color:#f8fafc;font-size:18px;width:100%;font-weight:500" id="epog-cmd-input" autocomplete="off" />
  `

  const listArea = document.createElement("div")
  listArea.style.cssText = "padding:8px;max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:2px"

  const commands = [
    { id: "opt-safe", icon: "🛡", label: "Optimize Prompt (Safe Mode)", desc: "Preserve constraints and structure" },
    { id: "opt-bal", icon: "⚖", label: "Optimize Prompt (Balanced)", desc: "Smart deduplication and filler removal" },
    { id: "opt-agg", icon: "🔥", label: "Optimize Prompt (Aggressive)", desc: "Maximal compression" },
    { id: "view-diff", icon: "👁", label: "View Semantic Diff", desc: "Compare original vs optimized" },
    { id: "gov-scan", icon: "🔍", label: "Run Security/PII Scan", desc: "Detect credentials and secrets" },
    { id: "mem-pin", icon: "📌", label: "Pin to Session Memory", desc: "Save context for future prompts" }
  ]

  let selectedIndex = 0

  function renderList() {
    listArea.innerHTML = ""
    commands.forEach((cmd, idx) => {
      const item = document.createElement("div")
      item.style.cssText = `
        padding:12px 14px;
        border-radius:10px;
        display:flex;
        align-items:center;
        gap:14px;
        cursor:pointer;
        background:${idx === selectedIndex ? "rgba(99,102,241,0.15)" : "transparent"};
        color:${idx === selectedIndex ? "#f8fafc" : "#94a3b8"};
        transition:all 0.1s;
      `
      item.innerHTML = `
        <span style="font-size:16px">${cmd.icon}</span>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="font-weight:600;font-size:13px">${cmd.label}</span>
          <span style="font-size:11px;color:#64748b">${cmd.desc}</span>
        </div>
        ${idx === selectedIndex ? `<span style="margin-left:auto;font-size:10px;color:#6366f1;font-weight:700">↵</span>` : ""}
      `
      item.addEventListener("mouseenter", () => {
        selectedIndex = idx
        renderList()
      })
      item.addEventListener("click", () => executeCommand(cmd.id))
      listArea.appendChild(item)
    })
  }

  function closePalette() {
    overlay.style.opacity = "0"
    palette.style.transform = "scale(0.95)"
    overlay.style.pointerEvents = "none"
    _commandPaletteOpen = false
    setTimeout(() => textarea.focus(), 50)
  }

  function executeCommand(id: string) {
    closePalette()
    if (id.startsWith("opt-")) {
      executeOptimization(textarea, adapterName)
    } else if (id === "view-diff") {
      alert("Diff viewer opening in sidepanel...")
      chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" })
    } else if (id === "gov-scan") {
      triggerLiveAnalysis(textarea, adapterName, document.getElementById("epog-middleware")!)
    }
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePalette()
  })

  document.addEventListener("keydown", (e) => {
    if (!_commandPaletteOpen) return
    if (e.key === "Escape") closePalette()
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIndex = (selectedIndex + 1) % commands.length; renderList() }
    if (e.key === "ArrowUp") { e.preventDefault(); selectedIndex = (selectedIndex - 1 + commands.length) % commands.length; renderList() }
    if (e.key === "Enter") { e.preventDefault(); executeCommand(commands[selectedIndex].id) }
  }, true)

  palette.appendChild(inputArea)
  palette.appendChild(listArea)
  overlay.appendChild(palette)
  document.body.appendChild(overlay)

  renderList()

  return { overlay, palette, input: overlay.querySelector("input") }
}

let paletteInstance: ReturnType<typeof createCommandPalette> | null = null

function openCommandPalette(textarea: HTMLElement, adapterName: string) {
  if (!paletteInstance) paletteInstance = createCommandPalette(textarea, adapterName)
  paletteInstance.overlay.style.opacity = "1"
  paletteInstance.overlay.style.pointerEvents = "auto"
  paletteInstance.palette.style.transform = "scale(1)"
  paletteInstance.input?.focus()
  _commandPaletteOpen = true
}

// ─── OPTIMIZATION EXECUTION ──────────────────────────────────────────────────

function executeOptimization(textarea: HTMLElement, adapterName: string) {
  if (_isOptimizing) return
  if (!_analysisCache) return // Need analysis first

  const originalText = getTextareaValue(textarea)
  if (!originalText.trim()) return

  _isOptimizing = true

  // Visual feedback: brief flash on textarea
  textarea.style.transition = "filter 0.2s"
  textarea.style.filter = "brightness(1.5) hue-rotate(20deg)"

  setTimeout(() => {
    setTextareaValue(textarea, _analysisCache!.optimizedPrompt)
    textarea.style.filter = "none"
    _isOptimizing = false

    // Clear passive indicator
    _analysisCache = null
    _lastAnalyzedText = getTextareaValue(textarea)
    const container = document.getElementById("epog-middleware")
    if (container) updatePassiveIndicator(container, null)
  }, 200)
}

// ─── BOOTSTRAP ───────────────────────────────────────────────────────────────

function bootstrap() {
  const adapter = findAdapter(window.location.href)
  if (!adapter) return

  console.log(`[EPOG-M] AI Workflow Intelligence Layer active for ${adapter.name}`)

  const interval = setInterval(() => {
    const textarea = adapter.getTextarea()
    if (textarea && !textarea.dataset.epogLayerAttached) {
      textarea.dataset.epogLayerAttached = "true"
      
      const container = createMiddlewareContainer()
      textarea.parentElement?.appendChild(container)

      // Attach debounced listener for Layer 1
      textarea.addEventListener("keyup", () => {
        triggerLiveAnalysis(textarea, adapter.name, container)
      })

      // Layer 1 indicator click -> run optimization
      container.addEventListener("click", (e) => {
        const indicator = container.querySelector("#epog-inline-indicator")
        if (indicator && indicator.contains(e.target as Node)) {
          executeOptimization(textarea, adapter.name)
        }
      })

      // Command Palette Trigger: Cmd/Ctrl + Shift + K
      textarea.addEventListener("keydown", (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
          e.preventDefault()
          e.stopPropagation()
          openCommandPalette(textarea, adapter.name)
        }
      })
    }
  }, 1000)

  window.addEventListener("beforeunload", () => clearInterval(interval))
}

// Start immediately (setInterval handles DOM readiness)
bootstrap()
