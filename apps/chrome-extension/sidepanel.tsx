import { useState } from "react"
import "./style.css"

function SidePanel() {
  const [stats, setStats] = useState({ saved: 68, risk: "Low", bandwidth: 85 })

  return (
    <div className="p-4 bg-slate-900 text-white h-screen font-sans">
      <header className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">A</div>
        <h1 className="text-xl font-bold tracking-tight">ACOS Companion</h1>
      </header>

      <section className="space-y-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Cognitive Bandwidth</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-purple-400">{stats.bandwidth}%</span>
            <span className="text-slate-500 mb-1 text-sm">Efficiency</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <h3 className="text-xs font-medium text-slate-400 mb-1">Tokens Saved</h3>
            <p className="text-xl font-bold text-green-400">{stats.saved}%</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <h3 className="text-xs font-medium text-slate-400 mb-1">Failure Risk</h3>
            <p className="text-xl font-bold text-blue-400">{stats.risk}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Semantic Continuity</h2>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              Architecture: Next.js Monorepo detected
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              Session: Debugging hydration mismatch
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              Memory: Preserving auth middleware context
            </li>
          </ul>
        </div>
      </section>

      <footer className="absolute bottom-4 left-4 right-4 text-[10px] text-slate-500 text-center">
        Universal AI Context Companion v0.1.0 • Local-First
      </footer>
    </div>
  )
}

export default SidePanel
