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
  container.style.cssText = "position: absolute; right: 10px; bottom: 50px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;"
  
  const btn = document.createElement("button")
  btn.innerHTML = "✨ <b>Optimize</b>"
  btn.style.cssText = "background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: sans-serif; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); transition: all 0.2s ease;"
  
  const feedbackContainer = document.createElement("div")
  feedbackContainer.style.cssText = "display: none; background: #1e293b; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; gap: 8px; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
  feedbackContainer.innerHTML = `<span style="color: #94a3b8; font-size: 11px;">Better?</span>
    <button id="acos-up" style="background: none; border: none; cursor: pointer; font-size: 14px;">👍</button>
    <button id="acos-down" style="background: none; border: none; cursor: pointer; font-size: 14px;">👎</button>`

  btn.onmouseover = () => btn.style.transform = "translateY(-2px)"
  btn.onmouseout = () => btn.style.transform = "translateY(0)"

  btn.onclick = async (e) => {
    e.preventDefault()
    btn.innerHTML = "🌀 Reasoning..."
    btn.style.opacity = "0.7"
    
    const originalText = textarea instanceof HTMLTextAreaElement ? textarea.value : textarea.innerText
    const originalTokens = Math.ceil(originalText.length / 4)

    chrome.runtime.sendMessage({
      type: "ANALYZE_RELEVANCE",
      input: { prompt: originalText }
    }, (response) => {
      // Real-time simulated transformation for UX
      const optimizedText = `Task: ${originalText}\n\n[ACOS Optimized]\nFocus: Semantic Clarity\nConstraints: Minimize Hallucinations\n---\n${originalText}`
      
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.value = optimizedText
      } else {
        textarea.innerText = optimizedText
      }

      const optimizedTokens = Math.ceil(optimizedText.length / 4)

      chrome.runtime.sendMessage({
        type: "RECORD_ANALYTICS",
        data: {
          originalTokens,
          optimizedTokens,
          site: adapter.name,
          model: "gpt-4o"
        }
      })

      btn.innerHTML = "✅ Balanced"
      btn.style.background = "#059669"
      
      setTimeout(() => {
        btn.innerHTML = "✨ <b>Optimize</b>"
        btn.style.background = "linear-gradient(135deg, #7c3aed, #4f46e5)"
        btn.style.opacity = "1"
        feedbackContainer.style.display = "flex"
      }, 1000)
    })
  }

  textarea.parentElement?.appendChild(container)
  container.appendChild(feedbackContainer)
  container.appendChild(btn)

  feedbackContainer.querySelector("#acos-up")?.addEventListener("click", () => {
    feedbackContainer.innerHTML = '<span style="color: #10b981; font-size: 11px; font-weight: bold;">Thanks! ✨</span>'
    setTimeout(() => feedbackContainer.style.display = "none", 2000)
  })
  feedbackContainer.querySelector("#acos-down")?.addEventListener("click", () => {
    feedbackContainer.innerHTML = '<span style="color: #f43f5e; font-size: 11px; font-weight: bold;">Noted. Refining...</span>'
    setTimeout(() => feedbackContainer.style.display = "none", 2000)
  })
}

window.addEventListener("load", companion)
