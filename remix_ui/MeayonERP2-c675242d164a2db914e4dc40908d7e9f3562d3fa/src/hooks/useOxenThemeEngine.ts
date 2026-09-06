import { useEffect, useState } from 'react';

export interface SystemSettings {
  system_name: string;
  company_name: string;
  vat_rate: number;
  theme_mode: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  logo_url: string | null;
}

export const useOxenThemeEngine = (tenantLicenseKey?: string) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

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

        const data: SystemSettings = await response.json();
        if (controller.signal.aborted) {
          return;
        }
        setSettings(data);

        document.title = data.system_name;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', data.primary_color);
        root.style.setProperty('--secondary-color', data.secondary_color);
        root.style.setProperty('--font-family', data.font_family);
        root.dataset.themeMode = data.theme_mode.toLowerCase();
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Theme configuration could not be loaded:', error);
        }
      }
    };

    fetchBrandingAndThemes();
    return () => controller.abort();
  }, [tenantLicenseKey]);

  return settings;
};