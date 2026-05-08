import type { PlasmoCSConfig } from "plasmo"
import { findAdapter } from "~adapters"

export const config: PlasmoCSConfig = {
  matches: ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*", "https://gemini.google.com/*"]
}

const companion = () => {
  const adapter = findAdapter(window.location.href)
  if (!adapter) return

  console.log(`[ACOS] Companion active for ${adapter.name}`)

  setInterval(() => {
    const textarea = adapter.getTextarea()
    if (textarea && !textarea.dataset.acosInjected) {
      injectOptimizationUI(textarea, adapter)
      textarea.dataset.acosInjected = "true"
    }
  }, 1000)
}

function injectOptimizationUI(textarea: HTMLElement, adapter: any) {
  const container = document.createElement("div")
  container.style.cssText = "position: absolute; right: 10px; bottom: 50px; z-index: 9999;"
  
  const btn = document.createElement("button")
  btn.innerText = "✨ Optimize"
  btn.style.cssText = "background: #7c3aed; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;"
  
  btn.onclick = async (e) => {
    e.preventDefault()
    const originalText = textarea instanceof HTMLTextAreaElement ? textarea.value : textarea.innerText
    
    // Send to background for ACOS orchestration
    chrome.runtime.sendMessage({
      type: "ANALYZE_RELEVANCE",
      input: { prompt: originalText }
    }, (response) => {
      console.log("[ACOS] Optimized Packet:", response)
      // In a full implementation, we'd update the textarea here
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.value = `[OPTIMIZED] ${originalText}`
      } else {
        textarea.innerText = `[OPTIMIZED] ${originalText}`
      }
    })
  }

  textarea.parentElement?.appendChild(container)
  container.appendChild(btn)
}

window.addEventListener("load", companion)
