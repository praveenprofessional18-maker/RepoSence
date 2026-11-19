export const LATEST_ANALYSIS_KEY = 'reposense.latest-analysis'
export const HISTORY_KEY = 'reposense.analysis-history'

export function readLatestAnalysis() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LATEST_ANALYSIS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLatestAnalysis(data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LATEST_ANALYSIS_KEY, JSON.stringify(data))
}

export function readHistory() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function pushHistory(entry) {
  if (typeof window === 'undefined') return []
  const history = readHistory()
  const next = [entry, ...history.filter(item => item.fullName !== entry.fullName)].slice(0, 8)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  return next
}
