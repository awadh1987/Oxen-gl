import React, { useEffect, useState } from 'react';
import { KeyRound, Palette, ShieldCheck } from 'lucide-react';

type SubscriptionTier = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

interface IssuedLicense {
  tenant_id: string;
  company_name: string;
  license_key: string;
  subscription_tier: SubscriptionTier;
  max_allowed_cost_centers: number;
  expires_at: string;
}

export const SaaSLicenseProvisioner: React.FC = () => {
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tier, setTier] = useState<SubscriptionTier>('BASIC');
  const [primaryColor, setPrimaryColor] = useState('#1E3A8A');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [statusMessage, setStatusMessage] = useState('');
  const [issuedLicense, setIssuedLicense] = useState<IssuedLicense | null>(null);

  useEffect(() => {
    fetch('/api/system/settings')
      .then((response) => {
        if (!response.ok) throw new Error('Settings unavailable');
        setStatusMessage('System gateway is available.');
      })
      .catch(() => setStatusMessage('System gateway is unavailable.'));
  }, []);

  const handleIssueLicense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!superAdminKey || !companyName.trim()) {
      setStatusMessage('SuperAdmin key and company name are required.');
      return;
    }

    try {
      const response = await fetch('/api/saas/issue-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-System-SuperAdmin': superAdminKey,
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          subscription_tier: tier,
          max_allowed_cost_centers: tier === 'BASIC' ? 5 : tier === 'PROFESSIONAL' ? 25 : 100,
          ui_theme_mode: 'CUSTOM',
          ui_primary_color: primaryColor,
          ui_secondary_color: secondaryColor,
          ui_font_family: 'Inter, sans-serif',
          ui_logo_url: null,
          expires_in_days: 365,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Provisioning rejected.');

      setIssuedLicense(data);
      setCompanyName('');
      setSuperAdminKey('');
      setStatusMessage(`License issued for ${data.company_name}. Record the key before leaving this page.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Network timeout communicating with SaaS gateway.');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">SaaS Tenant Licensing</h2>
          <p className="mt-1 text-xs text-slate-500">Provision a licensed tenant and its visual identity.</p>
        </div>
      </div>

      {statusMessage && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{statusMessage}</p>}

      <form onSubmit={handleIssueLicense} className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          System SuperAdmin Key
          <input className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" type="password" value={superAdminKey} onChange={(event) => setSuperAdminKey(event.target.value)} autoComplete="off" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Company Name
            <input className="rounded-md border border-slate-300 px-3 py-2" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Al-Nasr Logistics" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Subscription Tier
            <select className="rounded-md border border-slate-300 px-3 py-2" value={tier} onChange={(event) => setTier(event.target.value as SubscriptionTier)}>
              <option value="BASIC">Basic, 5 cost centers</option>
              <option value="PROFESSIONAL">Professional, 25 cost centers</option>
              <option value="ENTERPRISE">Enterprise, 100 cost centers</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Primary Color
            <span className="flex gap-2"><input className="h-10 w-12 cursor-pointer rounded border border-slate-300 p-1" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /><input className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Secondary Color
            <span className="flex gap-2"><input className="h-10 w-12 cursor-pointer rounded border border-slate-300 p-1" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /><input className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /></span>
          </label>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" type="submit">
          <KeyRound className="h-4 w-4" /> Issue Tenant License
        </button>
      </form>

      {issuedLicense && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Palette className="h-4 w-4" /> New License</div>
          <p className="mt-2 break-all rounded bg-white p-3 font-mono text-xs text-slate-800">{issuedLicense.license_key}</p>
          <p className="mt-2 text-xs text-amber-800">{issuedLicense.company_name} | {issuedLicense.subscription_tier} | {issuedLicense.max_allowed_cost_centers} cost centers</p>
        </div>
      )}
    </section>
  );
};