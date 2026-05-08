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
    <div className="p-5 bg-[#0a0a0c] text-white h-screen font-sans flex flex-col overflow-hidden">
      {/* Premium Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-amber-400 rounded-2xl flex items-center justify-center font-black shadow-[0_0_20px_rgba(139,92,246,0.3)] transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">A</div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">ACOS</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Companion</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${isPro ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
          {isPro ? '💎 Pro' : 'Free'}
        </div>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-1">
        {/* Hero Impact Stats */}
        <section className="relative p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 to-black border border-slate-800/50 overflow-hidden group shadow-2xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-600/10 blur-[50px] rounded-full group-hover:bg-violet-600/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-2">Lifetime Preservation</span>
            <div className="text-5xl font-black tracking-tighter mb-1 tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              {analytics.totalTokensSaved.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 font-medium">Tokens saved locally</span>
          </div>
        </section>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 hover:border-slate-700 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Success Rate</p>
            <p className="text-xl font-black text-white">99.4%</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 hover:border-slate-700 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Optimizations</p>
            <p className="text-xl font-black text-white">{analytics.optimizationsCount}</p>
          </div>
        </div>

        {/* Intelligence Status */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Cognitive Status</h2>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
              <div className="w-1 bg-blue-500 rounded-full shrink-0 animate-pulse"></div>
              <div>
                <h4 className="text-xs font-bold text-blue-400 mb-0.5">Hallucination Shield Active</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">ACOS is monitoring prompt entropy and ensuring semantic grounding.</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <div className="w-1 bg-amber-500 rounded-full shrink-0"></div>
              <div>
                <h4 className="text-xs font-bold text-amber-400 mb-0.5">Model: {preferredModel}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Optimization profiles adapted for target reasoning architecture.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Wins */}
        {analytics.history.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Recent Insights</h2>
            <div className="space-y-3">
              {analytics.history.slice(0, 3).map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#111114] rounded-2xl border border-slate-800/30 hover:border-slate-700/50 transition-all cursor-default">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white mb-0.5 capitalize">{entry.site}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-black text-emerald-400">+{entry.saved}</span>
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.1em]">Saved</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isPro && (
          <button className="w-full py-5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(124,58,237,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
            Unleash Pro Performance
          </button>
        )}
      </div>

      <footer className="pt-6 border-t border-slate-900/50 mt-auto flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">v0.1.0 Alpha</span>
        <div className="flex gap-4">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Local Engine Active</span>
        </div>
      </footer>
    </div>
  )
}

export default SidePanel
