import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { compressText, estimateTokens } from "@repo/core"
import cssText from "data-text:~/style.css"

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const ChatOptimizer = () => {
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null)
  const [tokens, setTokens] = useState(0)

  useEffect(() => {
    const findTextarea = () => {
      const selectors = [
        "textarea",
        "#prompt-textarea", // ChatGPT
        "[contenteditable='true']", // Claude uses div
        ".input-area textarea"
      ]
      
      for (const selector of selectors) {
        const el = document.querySelector(selector) as HTMLTextAreaElement
        if (el) return el
      }
      return null
    }

    const interval = setInterval(() => {
      const el = findTextarea()
      if (el && el !== textarea) {
        setTextarea(el)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [textarea])

  const handleOptimize = () => {
    if (!textarea) return
    
    const originalText = textarea.value || textarea.innerText
    const optimized = compressText(originalText)
    
    if (textarea.tagName === "TEXTAREA") {
      textarea.value = optimized
    } else {
      textarea.innerText = optimized
    }

    // Trigger input event to notify the site's React/Vue state
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
  }

  if (!textarea) return null

  return (
    <div className="fixed bottom-24 right-8 z-[9999] flex flex-col gap-2 pointer-events-auto">
      <button
        onClick={handleOptimize}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 font-medium"
      >
        <span className="text-lg">⚡</span>
        Optimize Context
      </button>
    </div>
  )
}

export default ChatOptimizer
