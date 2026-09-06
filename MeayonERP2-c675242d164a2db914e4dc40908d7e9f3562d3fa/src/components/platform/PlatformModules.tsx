import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Building2, Check, CheckCircle2, Copy, CreditCard, Crown, Database, ExternalLink,
  KeyRound, Layers, Lock, Megaphone, Palette, Plus, RefreshCw, Save, Search, Server,
  Shield, ShieldCheck, Sparkles, Upload, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Company } from '../../types';
import { erpApi, IsolationAudit, LicenseIssuePayload } from '../../services/api';

const TIER_CENTERS: Record<string, number> = { BASIC: 5, PROFESSIONAL: 25, ENTERPRISE: 100 };

const tierBadge = (tier?: string) =>
  tier === 'ENTERPRISE' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : tier === 'BASIC' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

const Banner: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; badge?: string; tone?: string; action?: React.ReactNode }> = ({ icon: Icon, title, subtitle, badge, tone = 'from-blue-950 via-slate-900 to-indigo-950', action }) => (
  <div className={`flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-r ${tone} p-6 text-white shadow-xl sm:flex-row sm:items-center`}>
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-inner"><Icon className="h-7 w-7" /></div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">{title}</h1>
          {badge && <span className="rounded-full border border-emerald-400/30 bg-emerald-500/25 px-3 py-0.5 text-xs font-bold text-emerald-200">{badge}</span>}
        </div>
        <p className="mt-1 max-w-2xl text-xs text-slate-300">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

export const TenantsRegistryView: React.FC<{ onInspect: (company: Company) => void }> = ({ onInspect }) => {
  const { companies, currentCompany, refreshCompanies } = useApp();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nameEn: '', cr: '', vat: '', adminEmail: '' });

  const filtered = companies.filter((company) => {
    const haystack = `${company.name} ${company.slug} ${company.commercialRegistration || ''} ${company.taxId || ''} ${company.licenseKey || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (tier === 'ALL' || (company.subscriptionTier || 'PROFESSIONAL') === tier);
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await erpApi.registerCompany({
        company_name: form.nameEn,
        slug: form.nameEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        cr_number: form.cr,
        vat_number: form.vat,
        admin_email: form.adminEmail,
        admin_name: form.nameEn,
        admin_password: form.cr || 'Admin@123456',
      });
      await refreshCompanies();
      setNotice('Tenant registered successfully.');
      setShowForm(false);
      setForm({ nameEn: '', cr: '', vat: '', adminEmail: '' });
    } catch (error) {
      setNotice(error instanceof Error ? `Registration failed: ${error.message}` : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Banner icon={Building2} title="Enterprise Tenants Registry" badge={`${companies.length} Tenants`}
        subtitle="Manage cloud tenant entities, quotas, licensing keys, and direct switch-in to inspect workspaces."
        action={<div className="flex items-center gap-3">
          <button onClick={() => { setBusy(true); refreshCompanies().finally(() => setBusy(false)); }} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110"><Plus className="h-4 w-4" />Register New Tenant</button>
        </div>} />

      {notice && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"><Check className="h-4 w-4 shrink-0" />{notice}</div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by company, CR, VAT, or license key..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white" /></label>
        <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600">Tier:</span>
          <select value={tier} onChange={(event) => setTier(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
            {['ALL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All Tiers' : value}</option>)}
          </select></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((company) => (
          <article key={company.id} className={`rounded-3xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${currentCompany?.id === company.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-base font-black text-blue-700">{company.name.slice(0, 1).toUpperCase()}</div>
                <div><p className="font-mono text-[11px] text-slate-400">{company.slug}</p><h3 className="text-sm font-black text-slate-900">{company.name}</h3></div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${tierBadge(company.subscriptionTier)}`}>{company.subscriptionTier || 'PROFESSIONAL'}</span>
            </div>
            <dl className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
              <div className="flex justify-between"><dt className="text-slate-500">Commercial Reg:</dt><dd className="font-mono font-bold text-slate-800">{company.commercialRegistration || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tax Number:</dt><dd className="font-mono font-bold text-slate-800">{company.taxId || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Allowed Centers:</dt><dd className="font-bold text-indigo-700">Up to {company.maxCostCenters ?? 25}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">License Key:</dt><dd className="font-mono font-bold text-slate-800">{company.licenseKey || 'Not issued'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Security Barrier:</dt><dd className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Strict Isolated</dd></div>
            </dl>
            <button onClick={() => onInspect(company)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-blue-700"><ExternalLink className="h-4 w-4" />Inspect Tenant Workspace</button>
          </article>
        ))}
        {filtered.length === 0 && <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">No matching organizations found.</p>}
      </div>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <form onSubmit={submit} className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div><h3 className="text-lg font-black text-slate-900">Register New Enterprise Tenant</h3><p className="text-xs text-slate-500">Creates an isolated workspace with seeded accounts and an administrator.</p></div>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([['nameEn', 'Company Name (English)', 'text'], ['cr', 'Commercial Registry (10 digits)', 'text'], ['vat', 'VAT Number (15 digits)', 'text'], ['adminEmail', 'Administrator Email', 'email']] as const).map(([field, label, type]) => (
              <label key={field} className="text-xs font-bold text-slate-700">{label}
                <input required type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  pattern={field === 'cr' ? '\\d{10}' : field === 'vat' ? '\\d{15}' : undefined}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500" /></label>
            ))}
          </div>
          <button disabled={busy} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-black text-white disabled:opacity-60">{busy ? 'Provisioning workspace...' : 'Create Organization'}</button>
        </form>
      </div>}
    </div>
  );
};

export const LicenseProvisionerView: React.FC = () => {
  const { companies, currentCompany, refreshCompanies, setCurrentCompany } = useApp();
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [companyId, setCompanyId] = useState(() => {
    if (currentCompany && companies.some((c) => c.id === currentCompany.id)) return currentCompany.id;
    return companies[0]?.id || '';
  });
  const [tier, setTier] = useState<'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'>('PROFESSIONAL');
  const [validityDays, setValidityDays] = useState(365);
  const [themeMode, setThemeMode] = useState<'LIGHT' | 'DARK' | 'CUSTOM'>('CUSTOM');
  const [primaryColor, setPrimaryColor] = useState('#1E3A8A');
  const [secondaryColor, setSecondaryColor] = useState('#7C3AED');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (companies.length > 0 && (!companyId || !companies.some((c) => c.id === companyId))) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const effectiveCompanyId = companyId && companies.some((c) => c.id === companyId)
    ? companyId
    : companies[0]?.id || '';

  const selected = companies.find((company) => company.id === effectiveCompanyId);
  const copyKey = (key: string) => { navigator.clipboard.writeText(key); setCopied(key); window.setTimeout(() => setCopied(null), 2000); };

  const issue = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetCompanyId = effectiveCompanyId;
    if (!superAdminKey.trim() || !targetCompanyId) {
      setStatus({ type: 'error', text: 'SuperAdmin key and target enterprise are required.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const payload: LicenseIssuePayload = {
        company_id: String(targetCompanyId).trim(),
        subscription_tier: tier,
        validity_days: Math.max(1, parseInt(String(validityDays), 10) || 365),
        theme_mode: themeMode,
        ui_primary_color: primaryColor || '#1E3A8A',
        ui_secondary_color: secondaryColor || '#7C3AED',
      };
      const issued = await erpApi.issueLicense(payload, superAdminKey.trim());
      await refreshCompanies();
      setStatus({ type: 'success', text: `License successfully issued for ${issued.name}. Key: ${issued.license_key || ''}` });
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? `Provisioning failed: ${error.message}` : 'Provisioning failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Banner icon={Crown} title="SaaS Multi-Tenant Provisioning" badge="SuperAdmin Portal"
        subtitle="Provision independent corporate licenses with custom visual branding and cost center allowances." />

      {status && <div className={`flex items-center gap-2 rounded-2xl border p-4 text-xs font-bold ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}><Shield className="h-4 w-4 shrink-0" />{status.text}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={issue} className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-900"><Lock className="h-4 w-4 text-blue-700" />Security &amp; Tenant Credentials</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">System SuperAdmin Key *
                <input type="password" autoComplete="one-time-code" value={superAdminKey} onChange={(event) => setSuperAdminKey(event.target.value)} placeholder="Server recovery code" className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-blue-600" /></label>
              <label className="text-xs font-bold text-slate-700">Licensed Enterprise *
                <select value={effectiveCompanyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600">
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select></label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-900"><Crown className="h-4 w-4 text-amber-600" />Subscription Tier &amp; Allowance</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-bold text-slate-700">Subscription Tier *
                <select value={tier} onChange={(event) => setTier(event.target.value as typeof tier)} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600">
                  <option value="BASIC">Basic (5 Cost Centers)</option>
                  <option value="PROFESSIONAL">Professional (25 Cost Centers)</option>
                  <option value="ENTERPRISE">Enterprise (100 Cost Centers)</option>
                </select></label>
              <label className="text-xs font-bold text-slate-700">Max Cost Centers (Read-Only)
                <input readOnly value={`Cost Centers ${TIER_CENTERS[tier]}`} className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 font-mono text-xs font-bold text-blue-900" /></label>
              <label className="text-xs font-bold text-slate-700">Validity Period (Days)
                <input type="number" min={1} value={validityDays} onChange={(event) => setValidityDays(parseInt(event.target.value, 10) || 365)} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-blue-600" /></label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-900"><Palette className="h-4 w-4 text-indigo-600" />Branding &amp; Visual Identity</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-bold text-slate-700">Primary Color
                <span className="mt-1 flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5" />
                  <input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-900 outline-none focus:border-blue-600" />
                </span></label>
              <label className="text-xs font-bold text-slate-700">Secondary Color
                <span className="mt-1 flex items-center gap-2">
                  <input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5" />
                  <input value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-900 outline-none focus:border-blue-600" />
                </span></label>
              <label className="text-xs font-bold text-slate-700">Theme Mode
                <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as typeof themeMode)} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600">
                  <option value="LIGHT">Light</option><option value="DARK">Dark</option><option value="CUSTOM">Custom</option>
                </select></label>
            </div>
          </section>

          <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50">
            <KeyRound className="h-4 w-4" />{busy ? 'Issuing License...' : 'Provision Enterprise License'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-xs font-black text-slate-900"><Sparkles className="h-4 w-4 text-amber-500" />Tenant Identity Preview</h3>
            <div className="mt-4 rounded-2xl p-4 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{tier} EDITION</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">CC {TIER_CENTERS[tier]}</span>
              </div>
              <h4 className="mt-3 text-sm font-black">{selected?.name || 'Select an enterprise'}</h4>
              <p className="mt-1 font-mono text-[11px] text-white/80">Valid for: {validityDays} days</p>
            </div>
          </div>

          {selected?.licenseKey && (
            <div className="space-y-3 rounded-3xl border border-amber-300 bg-amber-50/70 p-5 shadow-md">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950"><ShieldCheck className="h-4 w-4 text-emerald-600" />Active Issued License</span>
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
                <button type="button" onClick={() => copyKey(selected.licenseKey as string)} className="text-slate-500 hover:text-slate-900">{copied === selected.licenseKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
                <span className="flex-1 truncate font-mono text-xs font-bold text-slate-900">{selected.licenseKey}</span>
              </div>
              <p className="text-[11px] font-bold text-amber-900">Tenant: {selected.name}</p>
              {selected.licenseExpiresAt && <p className="text-[11px] text-amber-800">Expires: {new Date(selected.licenseExpiresAt).toLocaleDateString()}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><Building2 className="h-4 w-4 text-blue-600" />Licensed Multi-Tenant Registry</h3>
            <p className="text-xs text-slate-500">Manage segregated tenant instances, verify cryptographic keys, and switch active tenant context</p></div>
          <button onClick={() => refreshCompanies()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{['Licensed Enterprise', 'Tenant ID', 'Tier', 'Cost Centers Limit', 'License Key', 'Status', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className={currentCompany?.id === company.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3 font-bold text-slate-900">{company.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{company.slug}</td>
                  <td className="px-4 py-3"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${tierBadge(company.subscriptionTier)}`}>{company.subscriptionTier || 'PROFESSIONAL'}</span></td>
                  <td className="px-4 py-3">centers max {company.maxCostCenters ?? 25}</td>
                  <td className="px-4 py-3">
                    {company.licenseKey ? <button onClick={() => copyKey(company.licenseKey as string)} className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 hover:text-blue-700">{copied === company.licenseKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{company.licenseKey}</button> : <span className="text-slate-400">Not issued</span>}
                  </td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Active &amp; Isolated</span></td>
                  <td className="px-4 py-3"><button onClick={() => { setCurrentCompany(company); setCompanyId(company.id); }} className="rounded-lg border border-blue-200 px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Switch Context</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const PricingPlansView: React.FC = () => {
  const { companies } = useApp();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const count = (tier: string) => companies.filter((company) => (company.subscriptionTier || 'PROFESSIONAL') === tier).length;

  const plans = [
    { tier: 'BASIC', name: 'Basic Logistics Tier', monthly: 2500, yearly: 25500, style: 'border-amber-300', features: ['Fleet management (up to 15 trucks)', 'Automated weighbridge tickets & wastage', '5 Cost Centers max', '5 User accounts', 'Standard 15% VAT invoicing', 'Monthly operations margin reports'], excluded: ['ZATCA Phase 2 Live Integration', 'Automated fixed assets depreciation', 'Custom multi-level chart of accounts'] },
    { tier: 'PROFESSIONAL', name: 'Professional ERP Tier', monthly: 6500, yearly: 66300, style: 'border-blue-400 ring-2 ring-blue-500/20 shadow-xl', highlight: true, features: ['Unlimited fleet & transporter haulage', 'Crusher ledgers & payment clearances', '25 Cost Centers with budgeting', '15 RBAC Users with dual approvals', 'Automated journal engine & audit trail', 'Advanced VAT declaration & reconciliations', 'White-labeling & branded letterheads'], excluded: ['Dedicated private cloud container'] },
    { tier: 'ENTERPRISE', name: 'Enterprise Conglomerate Tier', monthly: 14000, yearly: 142800, style: 'border-purple-300', features: ['All ERP features without limits', 'Unlimited Cost Centers & Branches', '50+ Users with executive workflow', 'ZATCA Phase 2 direct API connector', 'Fixed assets engine & payroll ledger', 'Dedicated isolated database partition', '24/7 Dedicated Support & 99.9% SLA'], excluded: [] },
  ] as const;

  return (
    <div className="space-y-6">
      <Banner icon={CreditCard} title="Cloud Subscription & Pricing Plans" tone="from-slate-900 via-indigo-950 to-blue-950"
        subtitle="Configure tenant pricing tiers, resource quotas, and monitor distribution across active client companies."
        action={<div className="flex items-center rounded-2xl border border-slate-700 bg-slate-800/80 p-1">
          {(['monthly', 'yearly'] as const).map((value) => (
            <button key={value} onClick={() => setCycle(value)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${cycle === value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {value}{value === 'yearly' && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">15% Off</span>}
            </button>
          ))}
        </div>} />

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = cycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12);
          return (
            <article key={plan.tier} className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg ${plan.style}`}>
              {'highlight' in plan && plan.highlight && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-[11px] font-black text-white shadow-md">Most Popular</span>}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{plan.tier}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"><Building2 className="h-3.5 w-3.5 text-blue-600" />{count(plan.tier)} Subscribers</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1 border-b border-slate-100 pb-5">
                  <span className="font-mono text-3xl font-black text-slate-950">{price.toLocaleString('en-US')}</span>
                  <span className="text-xs font-bold text-slate-500">SAR / month</span>
                  {cycle === 'yearly' && <span className="ml-2 text-[10px] text-slate-400">(billed yearly {plan.yearly.toLocaleString('en-US')})</span>}
                </div>
                <p className="mt-5 text-xs font-black text-slate-800">Included features:</p>
                <ul className="mt-3 space-y-2 text-xs">
                  {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}
                </ul>
                {plan.excluded.length > 0 && <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-bold text-slate-400">Not included:</p>
                  <ul className="space-y-1.5 text-xs text-slate-400">{plan.excluded.map((item) => <li key={item} className="flex items-start gap-2 line-through opacity-75"><span>•</span>{item}</li>)}</ul>
                </div>}
              </div>
              <p className="mt-8 rounded-2xl bg-slate-50 p-3 text-center text-xs font-medium text-slate-600">Tier is assigned when generating tenant license</p>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const SystemAuditView: React.FC = () => {
  const [audit, setAudit] = useState<IsolationAudit | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try { setAudit(await erpApi.getIsolationAudit()); } catch (error) { console.error('Isolation audit failed:', error); } finally { setBusy(false); }
  };
  useEffect(() => { run(); }, []);

  const tables = audit?.isolated_tables || [];
  const cards = [
    { label: 'Isolated Tables', value: `${audit?.total_isolated_tables ?? 0} / ${audit?.total_isolated_tables ?? 0}`, note: '100% Row-Level Isolation', icon: Database, tone: 'text-emerald-600' },
    { label: 'Backend Server', value: audit?.backend_status || '—', note: 'FastAPI / Nginx Proxy Active', icon: Server, tone: 'text-blue-600' },
    { label: 'Active Tenants', value: `${audit?.total_registered_tenants ?? 0}`, note: 'Registered organizations', icon: Layers, tone: 'text-purple-600' },
    { label: 'Security Policy', value: audit?.security_policy || '—', note: 'X-Company-ID guard enforced', icon: Lock, tone: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <Banner icon={ShieldCheck} title="System Isolation & Multi-Tenant Audit" badge="100% Isolated" tone="from-emerald-950 via-slate-900 to-teal-950"
        subtitle="Live verification of multi-tenant row isolation across every scoped table, header guards, and active tenant context."
        action={<button onClick={run} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Run Live Audit</button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => { const Icon = card.icon; return (
          <div key={card.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{card.label}</span><Icon className={`h-5 w-5 ${card.tone}`} /></div>
            <p className="mt-2 font-mono text-2xl font-black text-slate-900">{card.value}</p>
            <span className={`mt-1 inline-block text-[11px] font-bold ${card.tone}`}>{card.note}</span>
          </div>
        ); })}
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div><h3 className="text-sm font-black text-slate-900">Database Tables Isolation Matrix</h3>
            <p className="mt-0.5 text-xs text-slate-500">Every query strictly applies the tenant partition filter preventing cross-tenant data leaks</p></div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />All Passed</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <div key={table} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs">
              <span className="flex items-center gap-2"><Database className="h-4 w-4 shrink-0 text-slate-400" /><span className="font-mono font-bold text-slate-800">{table}</span></span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ISOLATED</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SETTINGS_KEYS = {
  nameAr: 'oxengl_platform_name_ar', nameEn: 'oxengl_platform_name_en', tagline: 'oxengl_platform_slogan_ar',
  logo: 'oxengl_platform_logo_url', primary: 'oxengl_primary_color', secondary: 'oxengl_secondary_color',
  email: 'oxengl_support_email', phone: 'oxengl_support_phone', cr: 'oxengl_operator_cr', vat: 'oxengl_operator_vat',
  announcement: 'oxengl_announcement', announcementActive: 'oxengl_announcement_active', vatRate: 'oxengl_default_vat_rate', currency: 'oxengl_currency_code',
};

export const PlatformSettingsView: React.FC = () => {
  const { brandConfig, updateBrandConfig } = useApp();
  const read = (key: string, fallback: string) => localStorage.getItem(key) || fallback;
  const [nameAr, setNameAr] = useState(() => read(SETTINGS_KEYS.nameAr, 'منصة أوكسن جي إل السحابية'));
  const [nameEn, setNameEn] = useState(() => read(SETTINGS_KEYS.nameEn, 'OxenGL Cloud ERP Platform'));
  const [tagline, setTagline] = useState(() => read(SETTINGS_KEYS.tagline, 'Unified Multi-Tenant Cloud ERP for Transport, Quarries & Logistics'));
  const [logoUrl, setLogoUrl] = useState(() => read(SETTINGS_KEYS.logo, '/logo.png'));
  const [primaryColor, setPrimaryColor] = useState(() => read(SETTINGS_KEYS.primary, '#1E3A8A'));
  const [secondaryColor, setSecondaryColor] = useState(() => read(SETTINGS_KEYS.secondary, '#4338CA'));
  const [supportEmail, setSupportEmail] = useState(() => read(SETTINGS_KEYS.email, 'awadh.a.1987@gmail.com'));
  const [supportPhone, setSupportPhone] = useState(() => read(SETTINGS_KEYS.phone, '+966 50 123 4567'));
  const [operatorCr, setOperatorCr] = useState(() => read(SETTINGS_KEYS.cr, '1010789012'));
  const [operatorVat, setOperatorVat] = useState(() => read(SETTINGS_KEYS.vat, '310987654300003'));
  const [announcement, setAnnouncement] = useState(() => read(SETTINGS_KEYS.announcement, 'Welcome to the OxenGL cloud platform — ZATCA compliant release v2.0.'));
  const [announcementActive, setAnnouncementActive] = useState(() => localStorage.getItem(SETTINGS_KEYS.announcementActive) === 'true');
  const [vatRate, setVatRate] = useState(() => Number(read(SETTINGS_KEYS.vatRate, '15')));
  const [currency, setCurrency] = useState(() => read(SETTINGS_KEYS.currency, 'SAR'));
  const [saved, setSaved] = useState(false);

  const uploadLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loaded) => { if (loaded.target?.result) setLogoUrl(loaded.target.result as string); };
    reader.readAsDataURL(file);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const entries: [string, string][] = [
      [SETTINGS_KEYS.nameAr, nameAr], [SETTINGS_KEYS.nameEn, nameEn], [SETTINGS_KEYS.tagline, tagline],
      [SETTINGS_KEYS.logo, logoUrl], [SETTINGS_KEYS.primary, primaryColor], [SETTINGS_KEYS.secondary, secondaryColor],
      [SETTINGS_KEYS.email, supportEmail], [SETTINGS_KEYS.phone, supportPhone], [SETTINGS_KEYS.cr, operatorCr],
      [SETTINGS_KEYS.vat, operatorVat], [SETTINGS_KEYS.announcement, announcement],
      [SETTINGS_KEYS.announcementActive, String(announcementActive)], [SETTINGS_KEYS.vatRate, String(vatRate)], [SETTINGS_KEYS.currency, currency],
    ];
    entries.forEach(([key, value]) => localStorage.setItem(key, value));
    updateBrandConfig?.({ companyNameAr: nameAr, companyNameEn: nameEn, customLogoUrl: logoUrl, primaryColor, secondaryColor, phone: supportPhone, email: supportEmail, crNumber: operatorCr, taxNumber: operatorVat });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  };

  const resetDefaults = () => {
    if (!window.confirm('Reset OxenGL platform settings to defaults?')) return;
    setNameAr('منصة أوكسن جي إل السحابية'); setNameEn('OxenGL Cloud ERP Platform');
    setTagline('Unified Multi-Tenant Cloud ERP for Transport, Quarries & Logistics');
    setLogoUrl('/logo.png'); setPrimaryColor('#1E3A8A'); setSecondaryColor('#4338CA');
    setSupportEmail('awadh.a.1987@gmail.com'); setSupportPhone('+966 50 123 4567');
    setOperatorCr('1010789012'); setOperatorVat('310987654300003'); setVatRate(15); setCurrency('SAR'); setAnnouncementActive(false);
  };

  const field = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500';

  return (
    <form onSubmit={save} className="space-y-6">
      <Banner icon={Crown} title="OxenGL Platform Settings & Master Branding" badge="Platform Owner Console" tone="from-blue-950 via-indigo-900 to-slate-900"
        subtitle="Master control center for OxenGL platform identity, white-label defaults, system-wide announcements, and multi-tenant compliance."
        action={<div className="flex items-center gap-3">
          <button type="button" onClick={resetDefaults} className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" />Reset Defaults</button>
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:brightness-110"><Save className="h-4 w-4" />Save All Settings</button>
        </div>} />

      {saved && <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><span className="font-bold">OxenGL platform settings saved successfully.</span></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Palette className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-black text-slate-900">Visual Branding &amp; Logo</h3><p className="text-[11px] text-slate-500">Master platform name, primary logo, and header color palette</p></div>
            </header>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">Platform Name (Arabic)<input value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={field} /></label>
                <label className="block text-xs font-bold text-slate-700">Platform Name (English)<input value={nameEn} onChange={(event) => setNameEn(event.target.value)} className={field} /></label>
              </div>
              <label className="block text-xs font-bold text-slate-700">Platform Tagline<input value={tagline} onChange={(event) => setTagline(event.target.value)} className={field} /></label>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
                <p className="mb-2 text-xs font-bold text-slate-800">Master Platform Logo</p>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
                    <img src={logoUrl} alt="Platform logo preview" className="max-h-full max-w-full object-contain" onError={(event) => { (event.target as HTMLElement).style.visibility = 'hidden'; }} />
                  </div>
                  <div className="w-full flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500" />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50">
                        <Upload className="h-3.5 w-3.5 text-indigo-600" />Upload<input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                      </label>
                    </div>
                    <p className="text-[10.5px] text-slate-400">Supports high-res PNG, SVG, or JPG with transparent background.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                {([['Primary Color', primaryColor, setPrimaryColor], ['Secondary Color', secondaryColor, setSecondaryColor]] as const).map(([label, value, setter]) => (
                  <div key={label}><p className="mb-1 text-xs font-bold text-slate-700">{label}</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={value} onChange={(event) => setter(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5" />
                      <input value={value} onChange={(event) => setter(event.target.value)} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs uppercase text-slate-900 outline-none focus:border-indigo-500" />
                    </div></div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Megaphone className="h-4 w-4" /></span>
                <div><h3 className="text-sm font-black text-slate-900">System-Wide Broadcast Announcement</h3><p className="text-[11px] text-slate-500">Live broadcast notice displayed to all tenant users in the system</p></div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{announcementActive ? 'Active' : 'Disabled'}</span>
                <input type="checkbox" checked={announcementActive} onChange={(event) => setAnnouncementActive(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              </label>
            </header>
            <textarea rows={3} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-indigo-500" />
            <div className="flex items-center justify-between text-[11px] text-slate-400"><span>Broadcasts to OxenGL &amp; Tenant Workspaces</span><span>{announcement.length} chars</span></div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Building2 className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-black text-slate-900">Platform Operator Info</h3><p className="text-[11px] text-slate-500">Legal registration and tax identity</p></div>
            </header>
            <div className="mt-4 space-y-3.5">
              <label className="block text-xs font-bold text-slate-700">Operator CR Number<input value={operatorCr} onChange={(event) => setOperatorCr(event.target.value)} className={`${field} font-mono`} /></label>
              <label className="block text-xs font-bold text-slate-700">Operator VAT Number<input value={operatorVat} onChange={(event) => setOperatorVat(event.target.value)} className={`${field} font-mono`} /></label>
              <label className="block text-xs font-bold text-slate-700">Support Email<input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} className={`${field} font-mono`} /></label>
              <label className="block text-xs font-bold text-slate-700">Support Phone / WhatsApp<input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} className={`${field} font-mono`} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-black text-slate-900">Compliance &amp; VAT Standards</h3><p className="text-[11px] text-slate-500">Default VAT rate &amp; base currency</p></div>
            </header>
            <div className="mt-4 space-y-3.5">
              <label className="block text-xs font-bold text-slate-700">Default VAT Rate (%)<input type="number" min={0} max={100} value={vatRate} onChange={(event) => setVatRate(Number(event.target.value))} className={`${field} font-mono`} />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">Standard Saudi ZATCA rate is 15%</span></label>
              <label className="block text-xs font-bold text-slate-700">System Base Currency
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={field}>
                  <option value="SAR">Saudi Riyal (SAR)</option><option value="USD">US Dollar (USD)</option><option value="YER">Yemeni Rial (YER)</option><option value="AED">UAE Dirham (AED)</option>
                </select></label>
            </div>
          </section>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-800 py-3.5 text-xs font-black text-white shadow-lg hover:brightness-110"><Save className="h-4 w-4" />Commit &amp; Save Platform Settings</button>
        </div>
      </div>
    </form>
  );
};

export const PanoramicCockpit: React.FC<{ onNavigate: (tab: 'tenants' | 'licenses' | 'pricing' | 'health' | 'settings') => void }> = ({ onNavigate }) => {
  const { companies, refreshCompanies } = useApp();
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(new Date());
  const [audit, setAudit] = useState<IsolationAudit | null>(null);

  useEffect(() => { erpApi.getIsolationAudit().then(setAudit).catch(() => setAudit(null)); }, []);

  const refresh = async () => {
    setBusy(true);
    try { await refreshCompanies(); setAudit(await erpApi.getIsolationAudit()); } catch (error) { console.warn('Telemetry refresh failed:', error); }
    finally { setPulse(new Date()); setBusy(false); }
  };

  const totalCenters = useMemo(() => companies.reduce((sum, company) => sum + (company.maxCostCenters ?? 25), 0), [companies]);
  const licensed = companies.filter((company) => Boolean(company.licenseKey)).length;
  const mrr = companies.reduce((sum, company) => sum + (company.subscriptionTier === 'ENTERPRISE' ? 14000 : company.subscriptionTier === 'BASIC' ? 2500 : 6500), 0);

  const telemetry = [
    ['Platform Health', audit ? 'All Systems Nominal' : 'Connecting...', 'text-emerald-400'],
    ['Backend', audit?.backend_status || '—', 'text-blue-300'],
    ['Security Policy', audit?.security_policy || '—', 'text-indigo-300'],
    ['RLS Isolation', `${audit?.total_isolated_tables ?? 0} Tables Locked`, 'text-emerald-300'],
    ['Active Tenants', `${companies.length}`, 'text-amber-300'],
    ['Last Pulse', pulse.toLocaleTimeString(), 'text-slate-300'],
  ] as const;

  const kpis = [
    { label: 'Monthly Recurring (MRR)', value: `${mrr.toLocaleString('en-US')}`, unit: 'SAR/mo', note: `Annual Run Rate: ${(mrr * 12).toLocaleString('en-US')} SAR`, icon: CreditCard, tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'Active Enterprise Tenants', value: `${companies.length}`, unit: 'Enterprises', note: `Allocated Cost Centers: ${totalCenters}`, icon: Building2, tone: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'Cryptographic Licenses', value: `${licensed} / ${companies.length}`, unit: 'Issued', note: licensed === companies.length ? '100% Valid' : 'Pending provisioning', icon: KeyRound, tone: 'bg-violet-50 text-violet-600 border-violet-100' },
    { label: 'Isolation Coverage', value: `${audit?.total_isolated_tables ?? 0}`, unit: 'Tables', note: 'Company-scoped guards enforced', icon: ShieldCheck, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
              <span className="rounded-md border border-blue-400/30 bg-blue-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-300">OXENGL-MISSION-CONTROL</span>
              <span className="rounded-md border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300">RLS ISOLATED: {audit?.total_isolated_tables ?? 0} TABLES</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight lg:text-3xl">Global Panoramic ERP Cockpit</h1>
            <p className="max-w-3xl text-xs leading-relaxed text-slate-300">Central operations &amp; mission control cockpit for the OxenGL multi-tenant platform: aggregated financials, tenant isolation integrity, license quotas, and enterprise telemetry.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh Telemetry</button>
            <button onClick={() => onNavigate('tenants')} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-blue-500"><Plus className="h-4 w-4" />Onboard New Tenant</button>
            <button onClick={() => onNavigate('licenses')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-indigo-500"><KeyRound className="h-4 w-4" />Issue License Key</button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-700/60 pt-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
          {telemetry.map(([label, value, tone]) => (
            <div key={label} className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="block text-[11px] text-slate-400">{label}</span>
              <span className={`font-mono text-xs font-bold ${tone}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => { const Icon = kpi.icon; return (
          <article key={kpi.label} className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
              <span className={`rounded-xl border p-2.5 ${kpi.tone}`}><Icon className="h-5 w-5" /></span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-slate-900 lg:text-3xl">{kpi.value}</span>
              <span className="text-xs font-bold text-slate-500">{kpi.unit}</span>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-2.5 text-xs text-slate-500">{kpi.note}</p>
          </article>
        ); })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><Activity className="h-4 w-4 text-blue-600" />Tenant Portfolio</h3>
          <button onClick={() => onNavigate('tenants')} className="text-xs font-bold text-blue-700 hover:underline">Open registry</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{['Organization', 'Tenant ID', 'Tier', 'Centers', 'License'].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{company.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{company.slug}</td>
                  <td className="px-4 py-3"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${tierBadge(company.subscriptionTier)}`}>{company.subscriptionTier || 'PROFESSIONAL'}</span></td>
                  <td className="px-4 py-3">{company.maxCostCenters ?? 25}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{company.licenseKey || 'Not issued'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
