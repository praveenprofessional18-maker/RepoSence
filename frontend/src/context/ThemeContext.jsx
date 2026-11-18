import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { normalizeThemePreference, resolveThemePreference, THEME_STORAGE_KEY } from '../utils/themePreference'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [hasSavedPreference, setHasSavedPreference] = useState(() => (
    normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY)) !== null
  ))
  const [theme, setTheme] = useState(() => {
    const prefersDark = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches
    return resolveThemePreference(localStorage.getItem(THEME_STORAGE_KEY), prefersDark)
  })

  useEffect(() => {
    if (hasSavedPreference || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handlePreferenceChange = (event) => setTheme(event.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handlePreferenceChange)

    return () => mediaQuery.removeEventListener('change', handlePreferenceChange)
  }, [hasSavedPreference])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    if (hasSavedPreference) localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme, hasSavedPreference])

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => {
      setHasSavedPreference(true)
      setTheme(current => current === 'dark' ? 'light' : 'dark')
    }
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
