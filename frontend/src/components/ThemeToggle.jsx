import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

/**
 * TrendVolt Production Theme Toggle Button
 * Allows seamless switching between Light Mode (default) and Dark Mode.
 * Persists user preference across page reloads via localStorage.
 */
function ThemeToggle({ variant = 'desktop', className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const accessibleLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  if (variant === 'mobile-row') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#1F211C] hover:bg-[#FAF7F0] transition-colors cursor-pointer ${className}`}
      >
        <span className="flex items-center gap-2.5 font-medium">
          {isDark ? (
            <Sun className="h-4 w-4 text-[#A65332]" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4 text-[#5F6057]" aria-hidden="true" />
          )}
          <span>Appearance</span>
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-[#85857A] px-2 py-0.5 rounded-full border border-[#DED7CA] bg-[#FAF7F0]">
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] ${className}`}
    >
      {isDark ? (
        <Sun
          className="h-4.5 w-4.5 text-[#D4714D] transition-transform duration-300 hover:rotate-45"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-4.5 w-4.5 transition-transform duration-300 hover:-rotate-12"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
    </button>
  )
}

export default ThemeToggle
