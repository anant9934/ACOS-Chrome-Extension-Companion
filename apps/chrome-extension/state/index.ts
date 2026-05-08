import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

export const storage = new Storage()

// Types for analytics
export interface AnalyticsData {
  totalTokensSaved: number
  optimizationsCount: number
  history: Array<{
    timestamp: number
    saved: number
    site: string
    model: string
  }>
}

export const INITIAL_ANALYTICS: AnalyticsData = {
  totalTokensSaved: 0,
  optimizationsCount: 0,
  history: []
}

// Hook for UI
export const useACOSAnalytics = () => {
  const [data, setData] = useStorage<AnalyticsData>("acos-analytics", INITIAL_ANALYTICS)
  
  const addOptimization = async (original: number, optimized: number, site: string, model: string) => {
    const saved = original - optimized
    const newData = {
      totalTokensSaved: (data?.totalTokensSaved || 0) + saved,
      optimizationsCount: (data?.optimizationsCount || 0) + 1,
      history: [{ timestamp: Date.now(), saved, site, model }, ...(data?.history || [])].slice(0, 100)
    }
    await storage.set("acos-analytics", newData)
  }

  return { data: data || INITIAL_ANALYTICS, addOptimization }
}

export const useACOSPreferences = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useStorage("onboarding-completed", false)
  const [preferredModel, setPreferredModel] = useStorage("preferred-model", "gpt-4o")
  const [isPro, setIsPro] = useStorage("is-pro", false)
  
  return { 
    onboardingCompleted, 
    setOnboardingCompleted,
    preferredModel,
    setPreferredModel,
    isPro,
    setIsPro
  }
}
