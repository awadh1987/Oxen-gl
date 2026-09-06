import { useEffect, useState, useCallback } from 'react';

export interface SystemSettings {
  system_name: string;
  company_name: string;
  vat_rate: number;
  theme_mode: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  logo_url: string | null;
  themeMode?: ThemeMode;
  setThemeMode?: (mode: ThemeMode) => void;
  toggleThemeMode?: () => void;
}

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'oxen_theme_mode';
export const LEGACY_THEME_STORAGE_KEY = 'theme_mode';
const THEME_CHANGE_EVENT = 'oxen-theme-change';

/**
 * Retrieves the user's preferred theme mode from persistent local storage.
 */
export const getStoredThemeMode = (): ThemeMode | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const stored =
      localStorage.getItem(THEME_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (!stored) return null;
    const normalized = stored.toLowerCase().trim();
    if (normalized === 'dark') return 'dark';
    if (normalized === 'light') return 'light';
  } catch (error) {
    console.warn('Could not retrieve theme mode from localStorage:', error);
  }
  return null;
};

/**
 * Persists the preferred theme mode into local storage across sessions.
 */
export const persistThemeMode = (mode: ThemeMode): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Could not persist theme mode to localStorage:', error);
  }
};

/**
 * Synchronizes DOM attributes and classes to reflect active theme mode.
 */
export const applyThemeToDOM = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = mode;
};

/**
 * Programmatically changes and persists the preferred theme mode across the app.
 */
export const setPreferredThemeMode = (mode: ThemeMode): void => {
  persistThemeMode(mode);
  applyThemeToDOM(mode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }));
  }
};

export interface OxenThemeEngineResult extends SystemSettings {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  isDark: boolean;
}

export const useOxenThemeEngine = (tenantLicenseKey?: string): OxenThemeEngineResult => {
  // Synchronously initialize theme mode from persistent storage, defaulting to 'light'
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    const saved = getStoredThemeMode();
    if (saved) {
      applyThemeToDOM(saved);
      return saved;
    }
    return 'light';
  });

  const [rawSettings, setRawSettings] = useState<SystemSettings | null>(null);

  // Set theme mode handler
  const setThemeMode = useCallback((mode: ThemeMode) => {
    persistThemeMode(mode);
    applyThemeToDOM(mode);
    setCurrentTheme(mode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }));
    }
  }, []);

  // Toggle theme mode handler
  const toggleThemeMode = useCallback(() => {
    const nextMode: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [currentTheme, setThemeMode]);

  // Initial immediate DOM application
  useEffect(() => {
    const stored = getStoredThemeMode();
    if (stored) {
      applyThemeToDOM(stored);
      setCurrentTheme(stored);
    }
  }, []);

  // Synchronize across browser tabs and internal events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === LEGACY_THEME_STORAGE_KEY) {
        if (e.newValue) {
          const normalized = e.newValue.toLowerCase().trim();
          if (normalized === 'dark' || normalized === 'light') {
            applyThemeToDOM(normalized as ThemeMode);
            setCurrentTheme(normalized as ThemeMode);
          }
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail === 'dark' || customEvent.detail === 'light') {
        setCurrentTheme(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    };
  }, []);

  // Fetch backend branding and configuration
  useEffect(() => {
    const controller = new AbortController();

    const fetchBrandingAndThemes = async () => {
      try {
        const headers: HeadersInit = tenantLicenseKey
          ? { 'X-Tenant-License-Key': tenantLicenseKey }
          : {};
        const response = await fetch('/api/system/settings', { headers, signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Settings request failed with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Expected JSON response but got: ${contentType}`);
        }

        const data: SystemSettings = await response.json();
        if (controller.signal.aborted) {
          return;
        }

        setRawSettings(data);

        if (data.system_name) {
          document.title = data.system_name;
        }
        const root = document.documentElement;
        if (data.primary_color) root.style.setProperty('--primary-color', data.primary_color);
        if (data.secondary_color) root.style.setProperty('--secondary-color', data.secondary_color);
        if (data.font_family) root.style.setProperty('--font-family', data.font_family);

        // Check if user has an existing preference in local storage
        const userPreferred = getStoredThemeMode();
        let effectiveMode: ThemeMode;

        if (userPreferred) {
          // Keep user's persistent preference across sessions
          effectiveMode = userPreferred;
        } else {
          // Fall back to the system's configured default theme mode and persist it
          const rawServerMode = data.theme_mode ? data.theme_mode.toLowerCase().trim() : 'light';
          effectiveMode = rawServerMode === 'dark' ? 'dark' : 'light';
          persistThemeMode(effectiveMode);
        }

        applyThemeToDOM(effectiveMode);
        setCurrentTheme(effectiveMode);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Theme configuration fallback engaged:', error);
        }
      }
    };

    fetchBrandingAndThemes();
    return () => controller.abort();
  }, [tenantLicenseKey]);

  // Construct return object
  const result: OxenThemeEngineResult = {
    system_name: rawSettings?.system_name || 'Oxen GL',
    company_name: rawSettings?.company_name || 'Oxen Logistics & Contracting',
    vat_rate: Number(rawSettings?.vat_rate ?? 0.15),
    theme_mode: currentTheme,
    primary_color: rawSettings?.primary_color || '#0F172A',
    secondary_color: rawSettings?.secondary_color || '#F59E0B',
    font_family: rawSettings?.font_family || "'Plus Jakarta Sans', 'Tajawal', 'Noto Kufi Arabic', system-ui, sans-serif",
    logo_url: rawSettings?.logo_url ?? null,
    themeMode: currentTheme,
    setThemeMode,
    toggleThemeMode,
    isDark: currentTheme === 'dark',
  };

  return result;
};

/**
 * Lightweight helper hook to access and toggle theme mode.
 */
export const useTheme = () => {
  const engine = useOxenThemeEngine();
  return {
    themeMode: engine.themeMode,
    setThemeMode: engine.setThemeMode,
    toggleThemeMode: engine.toggleThemeMode,
    isDark: engine.isDark,
  };
};
