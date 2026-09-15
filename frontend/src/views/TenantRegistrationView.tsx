// File: frontend/src/views/TenantRegistrationView.tsx
import React, { useState } from 'react';
export interface TenantRegistrationViewProps {
  onSuccess?: () => void;
}

export const TenantRegistrationView: React.FC<TenantRegistrationViewProps> = ({ onSuccess }) => {
  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const [formData, setFormData] = useState({ nameAr: '', nameEn: '', slug: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name_ar: formData.nameAr,
          company_name_en: formData.nameEn,
          domain_slug: formData.slug.toLowerCase().trim(),
          admin_email: formData.email,
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.detail || "Onboarding pipeline processing error.");
      }

      const result = await response.json();
      setSuccessData(result);
    } catch (err: any) {
      setError(err.message || "Failed to initialize company provisioning engine.");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#090f1c] border border-emerald-500/20 rounded-2xl p-8 shadow-2xl text-center">
          <div className="text-4xl mb-4 animate-bounce">🚀</div>
          <h2 className="text-xl font-bold text-emerald-400">Workspace Generated!</h2>
          <p className="text-xs text-slate-400 mt-2">Your isolated multi-tenant data container has been successfully mapped and provisioned.</p>
          
          <div className="my-6 p-4 bg-[#030712] border border-slate-800 rounded-xl font-mono text-left text-xs space-y-2">
            <div className="text-slate-500">Corporate System Link:</div>
            <div className="text-cyan-400 font-bold underline select-all">
              https://oxengl.me{successData.workspace_slug}
            </div>
            <div className="text-[10px] text-emerald-500/70 pt-1">✓ Seeded Default 5-Deep General Ledger Hierarchy</div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-xs font-bold transition-colors cursor-pointer"
          >
            Proceed to Corporate Portal Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#090f1c] border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-xs font-mono text-slate-500 hover:text-slate-300">← Back</button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-200">Register New Enterprise Workspace</h2>
          <p className="text-xs text-slate-500 mt-1">Deploy an isolated cloud platform environment node instantly</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium font-mono text-rose-400 text-center">⚠️ {error}</div>
        )}

        <form onSubmit={handleRegistration} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name (Arabic)</label>
            <input type="text" value={formData.nameAr} onChange={(e) => setFormData({...formData, nameAr: e.target.value})} placeholder="شركة ميون الاقتصادية المحدودة" className="w-full px-4 py-2.5 bg-[#030712] border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-200 outline-none text-right font-medium" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name (English)</label>
            <input type="text" value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} placeholder="MYON ECONOMIC CO LTD." className="w-full px-4 py-2.5 bg-[#030712] border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-200 outline-none font-medium" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Requested Domain Workspace Slug</label>
            <div className="flex rounded-xl bg-[#030712] border border-slate-800 focus-within:border-cyan-500 overflow-hidden">
              <input type="text" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} placeholder="myon-economic" className="w-full px-4 py-2.5 bg-transparent text-sm text-slate-200 outline-none font-mono" required />
              <span className="bg-slate-900 border-l border-slate-800 px-3 py-2.5 text-xs font-mono text-slate-500 flex items-center">.oxengl.me</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Super Admin Account Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="admin@company.com" className="w-full px-4 py-2.5 bg-[#030712] border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-200 outline-none" required />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl py-3 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">
            {loading ? 'Provisioning Cloud Framework Matrix...' : 'Deploy Secure Workspace Infrastructure'}
          </button>
        </form>
      </div>
    </div>
  );
};
