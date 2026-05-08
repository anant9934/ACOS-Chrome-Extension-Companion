import { useACOSAnalytics, useACOSPreferences } from "./state"
import { Onboarding } from "./components/Onboarding"
import "./style.css"

function SidePanel() {
  const { data: analytics } = useACOSAnalytics()
  const { onboardingCompleted, preferredModel, isPro } = useACOSPreferences()

  if (!onboardingCompleted) {
    return <Onboarding />
  }

  return (
    <div className="p-4 bg-slate-950 text-white h-screen font-sans flex flex-col">
      <header className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-purple-900/20">A</div>
          <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Companion</h1>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${isPro ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
          {isPro ? 'PRO' : 'FREE'}
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
        {/* Real-time Impact */}
        <section className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <h2 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Reasoning Clarity</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">92</span>
              <span className="text-purple-500 font-bold">%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Predicted accuracy based on current context structure</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Lifetime Savings</h3>
              <p className="text-2xl font-black text-green-400">{analytics.totalTokensSaved.toLocaleString()}</p>
              <p className="text-[10px] text-slate-600 mt-1">Tokens preserved</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Risk Guard</h3>
              <p className="text-2xl font-black text-blue-400">Active</p>
              <p className="text-[10px] text-slate-600 mt-1">Hallucination shield</p>
            </div>
          </div>
        </section>

        {/* Intelligence Insights (Simplified Terminology) */}
        <section className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <h2 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">Session Memory</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-1 bg-purple-500 rounded-full shrink-0"></div>
              <div>
                <h4 className="text-xs font-bold text-white">Context Slicing Active</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">Surgically extracting relevant code fragments and removing verbose redundancy.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-blue-500 rounded-full shrink-0"></div>
              <div>
                <h4 className="text-xs font-bold text-white">Model Adaptive Mode</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">Optimizing prompt structure specifically for {preferredModel}.</p>
              </div>
            </div>
          </div>
        </section>

        {/* History */}
        {analytics.history.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Recent Optimizations</h2>
            <div className="space-y-2">
              {analytics.history.slice(0, 3).map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50 text-[10px]">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-bold">{entry.site}</span>
                    <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="px-2 py-1 bg-green-900/20 text-green-400 rounded-lg font-black">
                    +{entry.saved} tokens
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isPro && (
          <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-black text-sm shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Upgrade to Pro • $12/mo
          </button>
        )}
      </div>

      <footer className="pt-6 border-t border-slate-900 mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 px-1 uppercase tracking-widest">
          <span>Privacy Guaranteed</span>
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
        </div>
        <div className="text-[10px] text-slate-700 text-center">
          Companion v0.1.0 • Built for local-first cognition
        </div>
      </footer>
    </div>
  )
}

export default SidePanel
