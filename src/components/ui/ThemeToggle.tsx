import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export const ThemeToggle = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={isDark}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="theme-toggle focus-ring"
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        <Sun className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        <Moon className="w-5 h-5" strokeWidth={1.75} />
      </span>
    </button>
  );
};
