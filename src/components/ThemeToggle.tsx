import { Monitor, Moon, Sun } from 'lucide-react'
import IconButton from './IconButton'
import { useTheme } from '../theme'
import type { ThemePref } from '../theme'

const NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: Monitor, light: Sun, dark: Moon }
const LABEL: Record<ThemePref, string> = { system: 'System', light: 'Light', dark: 'Dark' }

// Cycles System -> Light -> Dark
export default function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [pref, setPref] = useTheme()
  return (
    <IconButton
      icon={ICON[pref]}
      size={size}
      label={`Theme: ${LABEL[pref]} (switch to ${LABEL[NEXT[pref]]})`}
      onClick={() => setPref(NEXT[pref])}
    />
  )
}
