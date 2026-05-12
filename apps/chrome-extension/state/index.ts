import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

export const storage = new Storage()

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface AnalyticsData {
  totalTokensSaved: number
  optimizationsCount: number
  avgReductionPercent: number
  avgGovernanceScore: number
  history: Array<{
    timestamp: number
    saved: number
    reductionPercent: number
    site: string
    model: string
  }>
}

export const INITIAL_ANALYTICS: AnalyticsData = {
  totalTokensSaved: 0,
  optimizationsCount: 0,
  avgReductionPercent: 0,
  avgGovernanceScore: 100,
  history: [],
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditEntry {
  sessionId: string
  timestamp: number
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
  stages: Array<{
    stage: string
    tokenDelta: number
    rationale: string
  }>
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export interface UserPreferences {
  onboardingCompleted: boolean
  preferredModel: string
  isPro: boolean
  autoOptimize: boolean
  showDiffPanel: boolean
  governanceLevel: "standard" | "strict" | "enterprise"
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingCompleted: false,
  preferredModel: "gpt-4o",
  isPro: false,
  autoOptimize: false,
  showDiffPanel: true,
  governanceLevel: "standard",
}

// ─── React Hooks ─────────────────────────────────────────────────────────────

export const useACOSAnalytics = () => {
  const [data] = useStorage<AnalyticsData>("acos-analytics", INITIAL_ANALYTICS)
  return { data: data ?? INITIAL_ANALYTICS }
}

export const useAuditLog = () => {
  const [entries] = useStorage<AuditEntry[]>("epog-audit-log", [])
  return { entries: entries ?? [] }
}

export const useACOSPreferences = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useStorage(
    "onboarding-completed", DEFAULT_PREFERENCES.onboardingCompleted
  )
  const [preferredModel, setPreferredModel] = useStorage(
    "preferred-model", DEFAULT_PREFERENCES.preferredModel
  )
  const [isPro, setIsPro] = useStorage("is-pro", DEFAULT_PREFERENCES.isPro)
  const [autoOptimize, setAutoOptimize] = useStorage(
    "auto-optimize", DEFAULT_PREFERENCES.autoOptimize
  )
  const [showDiffPanel, setShowDiffPanel] = useStorage(
    "show-diff", DEFAULT_PREFERENCES.showDiffPanel
  )
  const [governanceLevel, setGovernanceLevel] = useStorage<UserPreferences["governanceLevel"]>(
    "governance-level", DEFAULT_PREFERENCES.governanceLevel
  )

  return {
    onboardingCompleted,
    setOnboardingCompleted,
    preferredModel,
    setPreferredModel,
    isPro,
    setIsPro,
    autoOptimize,
    setAutoOptimize,
    showDiffPanel,
    setShowDiffPanel,
    governanceLevel,
    setGovernanceLevel,
  }
}
