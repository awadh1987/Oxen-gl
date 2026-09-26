import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Webhook,
  Key,
  ShieldCheck,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { CustomDomainWizard } from './CustomDomainWizard';
import { erpApi } from '../../services/api';

interface TenantSettingsPanelProps {
  tenantId: string;
  tenantSlug: string;
}

export const TenantSettingsPanel: React.FC<TenantSettingsPanelProps> = ({ tenantId, tenantSlug }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'domains' | 'webhooks' | 'api_keys' | 'sso'>('general');
  const [settings, setSettings] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Invite member modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    role: 'accountant',
    department: 'Operations',
  });

  useEffect(() => {
    loadSettings();
    loadTeam();
  }, [tenantId]);

  const loadSettings = async () => {
    try {
      const data = await erpApi.getTenantControlSettings(tenantId);
      if (data?.success) {
        setSettings(data.settings);
      } else {
        const res = await fetch('/api/tenant/control/settings', {
          headers: { 'x-tenant-id': tenantId, 'x-tenant-slug': tenantSlug },
        });
        const fallbackData = await res.json();
        if (fallbackData.success) {
          setSettings(fallbackData.settings);
        }
      }
    } catch (err) {
      console.warn('API getTenantControlSettings failed, attempting direct fetch:', err);
      try {
        const res = await fetch('/api/tenant/control/settings', {
          headers: { 'x-tenant-id': tenantId, 'x-tenant-slug': tenantSlug },
        });
        const fallbackData = await res.json();
        if (fallbackData?.success) {
          setSettings(fallbackData.settings);
        }
      } catch (innerErr) {
        console.error('Failed to load settings:', innerErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    try {
      const data = await erpApi.getTenantControlTeam(tenantId);
      if (data?.success) {
        setTeam(data.team);
      } else {
        const res = await fetch('/api/tenant/control/team', {
          headers: { 'x-tenant-id': tenantId, 'x-tenant-slug': tenantSlug },
        });
        const fallbackData = await res.json();
        if (fallbackData.success) {
          setTeam(fallbackData.team);
        }
      }
    } catch (err) {
      console.warn('API getTenantControlTeam failed, attempting direct fetch:', err);
      try {
        const res = await fetch('/api/tenant/control/team', {
          headers: { 'x-tenant-id': tenantId, 'x-tenant-slug': tenantSlug },
        });
        const fallbackData = await res.json();
        if (fallbackData?.success) {
          setTeam(fallbackData.team);
        }
      } catch (innerErr) {
        console.error('Failed to load team:', innerErr);
      }
    }
  };

  const handleSaveSection = async (sectionKey: string, payload: any) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const data = await erpApi.updateTenantControlSettings(
        { section: sectionKey, settings: payload, general: sectionKey === 'general' ? payload : undefined },
        tenantId
      );
      if (data?.success) {
        setSettings(data.settings || { ...settings, [sectionKey]: payload });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const res = await fetch('/api/tenant/control/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
            'x-tenant-slug': tenantSlug,
          },
          body: JSON.stringify({ section: sectionKey, settings: payload }),
        });
        const fallbackData = await res.json();
        if (fallbackData.success) {
          setSettings(fallbackData.settings || { ...settings, [sectionKey]: payload });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await erpApi.inviteTenantControlMember(inviteForm, tenantId);
      if (data?.success) {
        setShowInviteModal(false);
        setInviteForm({ full_name: '', email: '', role: 'accountant', department: 'Operations' });
        loadTeam();
      }
    } catch (err) {
      console.error('Error inviting member:', err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const data = await erpApi.deleteTenantControlMember(memberId, tenantId);
      if (data?.success) {
        loadTeam();
      }
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono">جاري تحميل إعدادات المنشأة...</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>لوحة تحكم مساحة عمل المنشأة (Tenant Control Panel)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إعدادات الهوية، أعضاء الفريق، النطاقات المخصصة، واجهات البرمجة (Webhooks / API Keys)، والربط المؤسسي.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم حفظ التغييرات بنجاح</span>
          </div>
        )}
      </div>

      {/* Progressive Disclosure Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-3 mb-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Building2 className="w-4 h-4" />
          <span>المعلومات الأساسية</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Users className="w-4 h-4" />
          <span>فريق العمل والصلاحيات</span>
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'domains' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Globe className="w-4 h-4" />
          <span>النطاقات المخصصة (Domains)</span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'webhooks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Webhook className="w-4 h-4" />
          <span>الخطافات البرمجية (Webhooks)</span>
        </button>

        <button
          onClick={() => setActiveTab('api_keys')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'api_keys' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Key className="w-4 h-4" />
          <span>مفاتيح الـ API</span>
        </button>

        <button
          onClick={() => setActiveTab('sso')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${activeTab === 'sso' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>الدخول الموحد (SSO / SAML)</span>
        </button>
      </div>

      {/* 1. General Settings Tab */}
      {activeTab === 'general' && settings && (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">اسم المنشأة التجاري</label>
              <input
                type="text"
                value={settings.general?.company_name || ''}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, company_name: e.target.value } })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">السجل التجاري (CR Number)</label>
              <input
                type="text"
                value={settings.general?.cr_number || ''}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, cr_number: e.target.value } })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">الرقم الضريبي (VAT / ZATCA ID)</label>
              <input
                type="text"
                value={settings.general?.vat_number || ''}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, vat_number: e.target.value } })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">العملة الافتراضية</label>
              <select
                value={settings.general?.currency || 'SAR'}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, currency: e.target.value } })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => handleSaveSection('general', settings.general)}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ الإعدادات الأساسية</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Team Management Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">أعضاء الفريق ومستويات الوصول ({team.length})</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>دعوة عضو جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">الاسم الكامل</th>
                  <th className="px-4 py-3">البريد الإلكتروني</th>
                  <th className="px-4 py-3">الدور الوظيفي (Role)</th>
                  <th className="px-4 py-3">القسم</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{member.full_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[10px] uppercase font-bold">
                        {member?.role ?? 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{member.department}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                        title="إلغاء العضوية"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Custom Domain Wizard Tab */}
      {activeTab === 'domains' && (
        <CustomDomainWizard tenantId={tenantId} tenantSlug={tenantSlug} />
      )}

      {/* 4. Webhooks Tab */}
      {activeTab === 'webhooks' && settings && (
        <div className="space-y-6 max-w-2xl animate-in fade-in duration-150">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">تفعيل الخطافات البرمجية (Outgoing Webhooks)</span>
              <button
                onClick={() => setSettings({ ...settings, webhooks: { ...settings.webhooks, enabled: !settings.webhooks?.enabled } })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.webhooks?.enabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.webhooks?.enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Webhook Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.yourcompany.com/webhooks/oxengl"
                value={settings.webhooks?.endpoint_url || ''}
                onChange={(e) => setSettings({ ...settings, webhooks: { ...settings.webhooks, endpoint_url: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Webhook Signing Secret</label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                <input
                  type={showSecret ? 'text' : 'password'}
                  readOnly
                  value={settings.webhooks?.secret_key || 'whsec_7d9e8a2b3c4d5e6f7a8b9c0d1e2f3a4b'}
                  className="flex-1 bg-transparent text-amber-400 font-mono focus:outline-none"
                />
                <button onClick={() => setShowSecret(!showSecret)} className="text-slate-400 hover:text-white">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={() => handleSaveSection('webhooks', settings.webhooks)}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات Webhooks</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. API Keys Tab */}
      {activeTab === 'api_keys' && settings && (
        <div className="space-y-4 max-w-2xl animate-in fade-in duration-150">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">مفتاح الوصول البرمجي النشط (Live API Key)</div>
                <div className="text-[11px] text-slate-500 font-mono">آخر استخدام: قبل 12 دقيقة</div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono uppercase">Active</span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-xs text-indigo-300 select-all">
              <span>{settings.api_keys?.primary_key || 'oxen_live_sk_8f7b2c9a1d4e6f889201a'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(settings.api_keys?.primary_key || '')}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="نسخ المفتاح"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">نطاق الصلاحيات (Scopes)</label>
              <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                {['trips:read', 'trips:write', 'invoices:read', 'zatca:dispatch', 'fleet:telemetry'].map((scope) => (
                  <span key={scope} className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SSO / SAML Tab */}
      {activeTab === 'sso' && settings && (
        <div className="space-y-4 max-w-2xl animate-in fade-in duration-150">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">فرض تسجيل الدخول الموحد (Enforce Corporate SSO)</span>
              <button
                onClick={() => setSettings({ ...settings, sso: { ...settings.sso, enforce_sso: !settings.sso?.enforce_sso } })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.sso?.enforce_sso ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.sso?.enforce_sso ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">IdP Entity ID / Metadata URL</label>
              <input
                type="text"
                placeholder="https://login.microsoftonline.com/{tenant-id}/federationmetadata/2007-06/federationmetadata.xml"
                value={settings.sso?.idp_entity_id || ''}
                onChange={(e) => setSettings({ ...settings, sso: { ...settings.sso, idp_entity_id: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              onClick={() => handleSaveSection('sso', settings.sso)}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات SSO</span>
            </button>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">دعوة عضو جديد إلى فريق العمل</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="محمد العتيبي"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  placeholder="m.otaibi@company.sa"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">الدور الوظيفي والصلاحيات</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="admin">مدير مساحة العمل (Workspace Admin)</option>
                  <option value="coo">مدير العمليات والأسطول (Operations & Fleet)</option>
                  <option value="accountant">محاسب ومسؤول الضرائب (Accountant & ZATCA)</option>
                  <option value="data_entry">مدخل بيانات وسندات (Data Entry)</option>
                  <option value="driver">سائق أسطول (Driver App Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                >
                  إرسال الدعوة فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
