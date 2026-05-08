import { useState } from 'react'
import { useACOSPreferences } from '../state'

export const Onboarding = () => {
  const [step, setStep] = useState(1)
  const { setOnboardingCompleted } = useACOSPreferences()

  const steps = [
    {
      title: "Welcome to ACOS",
      desc: "The universal context optimizer that improves your AI's reasoning while saving you tokens.",
      icon: "🌌"
    },
    {
      title: "How it Works",
      desc: "We surgicaly slice your code and restructure your prompts locally to ensure the AI focuses on what matters most.",
      icon: "✂️"
    },
    {
      title: "Privacy First",
      desc: "Everything happens on your machine. We never upload your code or conversations. Total privacy, guaranteed.",
      icon: "🛡️"
    },
    {
      title: "Ready to Optimize?",
      desc: "Look for the '✨ Optimize' button next to the chat box in ChatGPT, Claude, and Gemini.",
      icon: "🚀"
    }
  ]

  const current = steps[step - 1]

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900 text-white">
      <div className="text-6xl mb-6">{current.icon}</div>
      <h2 className="text-2xl font-bold mb-4">{current.title}</h2>
      <p className="text-slate-400 mb-8 leading-relaxed">{current.desc}</p>
      
      <div className="mt-auto w-full space-y-3">
        {step < steps.length ? (
          <button 
            onClick={() => setStep(step + 1)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-colors"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={() => setOnboardingCompleted(true)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-colors"
          >
            Get Started
          </button>
        )}
        
        <div className="flex gap-1 justify-center">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all ${i + 1 === step ? 'w-4 bg-purple-500' : 'w-1 bg-slate-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
