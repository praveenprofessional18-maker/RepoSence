export const THEME_STORAGE_KEY = 'reposense-theme'

export function normalizeThemePreference(value) {
  return value === 'light' || value === 'dark' ? value : null
}

export function resolveThemePreference(savedPreference, prefersDark = false) {
  return normalizeThemePreference(savedPreference) || (prefersDark ? 'dark' : 'light')
}

export function getThemeColor(theme) {
  return theme === 'dark' ? '#0b1120' : '#f8fafc'
}
