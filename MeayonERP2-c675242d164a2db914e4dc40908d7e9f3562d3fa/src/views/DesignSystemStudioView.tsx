import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  ShieldCheck,
  Rows3,
  Rows4,
  Sun,
  Moon,
  Copy,
  Check,
  Code2,
  LayoutGrid,
  Layers,
  Cpu,
  Truck,
  Building2,
  FileSpreadsheet,
  Receipt,
  Scale,
  Landmark,
  ExternalLink,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TENANT_PALETTES,
  TenantColorTheme,
  DensityMode,
  ThemeMode,
} from '../theme/designTokens';
import { BentoCard } from '../components/design-system/BentoCard';
import { IsolationTelemetryBadge } from '../components/design-system/IsolationTelemetryBadge';
import { MasterDetailDataGrid } from '../components/design-system/MasterDetailDataGrid';
import { WorkflowAutomationCanvas } from '../components/design-system/WorkflowAutomationCanvas';

export const DesignSystemStudioView: React.FC = () => {
  const {
    tenantTheme,
    setTenantTheme,
    densityMode,
    setDensityMode,
    themeMode,
    setThemeMode,
    isolationTelemetry,
    currentCompany,
    operations,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'themes' | 'cards' | 'grid' | 'workflow' | 'ai-prompt-gen'
  >('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedPromptModule, setSelectedPromptModule] = useState<string>('fleet-dashboard');

  const isDark = themeMode === 'dark';
  const activePalette = TENANT_PALETTES[tenantTheme] || TENANT_PALETTES.orange;
  const paletteList = Object.values(TENANT_PALETTES);

  // Sample data for master-detail preview
  const sampleOperations = operations.slice(0, 10);

  const sampleColumns = [
    { key: 'scale_ticket_no', header: 'Scale Ticket #', width: '130px' },
    { key: 'destination_customer', header: 'Customer Entity', width: '180px' },
    { key: 'loading_source', header: 'Crusher Quarry', width: '160px' },
    { key: 'material_type', header: 'Aggregate Material', width: '140px' },
    {
      key: 'qty_delivered',
      header: 'Net Weight (MT)',
      align: 'right' as const,
      render: (op: any) => (
        <span className="font-mono font-bold text-amber-400">
          {Number(op.qty_delivered || 0).toFixed(2)} MT
        </span>
      ),
    },
    {
      key: 'wastage_percentage',
      header: 'Shrinkage %',
      align: 'right' as const,
      render: (op: any) => (
        <span
          className={`font-mono font-bold ${
            op.wastage_percentage > 2 ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {Number(op.wastage_percentage || 0).toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: () => (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
          <ShieldCheck className="h-2.5 w-2.5" />
          Verified
        </span>
      ),
    },
  ];

  // AI Prompt Templates for Generating Enterprise Multi-Tenant Screens
  const aiPrompts: Record<string, { title: string; prompt: string; sampleCode: string }> = {
    'fleet-dashboard': {
      title: 'Bento Fleet Operations & Weighbridge Layout',
      prompt: `Generate an isolated multi-tenant ERP Fleet Operations View using OxenGL Design System:
- Theme: Deep-Dark Enterprise Mode (#0b0d19 to #111322 midnight backdrop)
- Accent: Dynamic tenant white-label primary (--tenant-primary)
- Isolation: Enforce Schema RLS L3 badge and active tenant boundary check
- Components:
  1. Top Telemetry Banner with 12ms latency, RLS L3 indicator, ZATCA readiness
  2. Bento metric cards for Delivered Tons, Fleet Trips, Scale Tickets, and Shrinkage
  3. Master-Detail Data Grid with sticky headers and slide-out side-sheet inspector
  4. Density mode aware padding (support both Comfortable and Compact modes)`,
      sampleCode: `// Generated OxenGL Multi-Tenant Fleet Layout
import { BentoCard } from '@/components/design-system/BentoCard';
import { IsolationTelemetryBadge } from '@/components/design-system/IsolationTelemetryBadge';
import { MasterDetailDataGrid } from '@/components/design-system/MasterDetailDataGrid';

export function FleetLogisticsView() {
  return (
    <div className="space-y-6">
      <IsolationTelemetryBadge variant="banner" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BentoCard title="Delivered Tons" icon={Truck} glow>
          <span className="text-2xl font-black font-mono text-amber-400">1,248.5 MT</span>
        </BentoCard>
      </div>
      <MasterDetailDataGrid data={operations} columns={columns} />
    </div>
  );
}`,
    },
    'financial-control': {
      title: 'ZATCA Tax Invoicing & Dual-Approval Ledger',
      prompt: `Generate a ZATCA Phase-2 Tax Invoicing & Dual Approval layout for OxenGL Multi-Tenant SaaS:
- Background: #0b0d19 with frosted slate #141726 containers
- Typography: High-contrast silver (#f8fafc) and luminous amber/orange accents
- Compliance: Real-time ZATCA Phase-2 Cryptographic Stamp, QR generation, SHA-256 digest
- Density: Compact financial data grid with alternating row shading and column dividers
- Side-Sheet: Instant audit view displaying itemized VAT splits and digital signature seal`,
      sampleCode: `// Generated OxenGL Invoicing Control Layout
<div className="space-y-5">
  <header className="flex justify-between items-center border-b border-slate-800 pb-4">
    <h1 className="text-xl font-black text-white">ZATCA Tax Invoicing Engine</h1>
    <IsolationTelemetryBadge variant="pill" />
  </header>
  <MasterDetailDataGrid
    data={invoices}
    columns={invoiceColumns}
    detailRenderer={(inv) => <InvoiceAuditDrawer invoice={inv} />}
  />
</div>`,
    },
    'workflow-builder': {
      title: 'Autonomous Cross-Department Workflow Pipeline',
      prompt: `Generate an interactive Process Automation Builder for multi-tenant cross-department actions:
- Canvas: Dotted grid background with radial dots (#ffffff18 on #090d1a)
- Connectors: SVG paths with animate-pulse-flow directional pulse animation
- Nodes: Containerized Bento cards representing Trigger, Condition, and Action
- Drawer: Parameter inspector drawer showing isolated tenant configurations`,
      sampleCode: `// Generated OxenGL Automation Canvas
<div className="h-[720px] rounded-3xl border border-slate-800 bg-[#090d1a]">
  <WorkflowAutomationCanvas />
</div>`,
    },
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-7 pb-16">
      {/* Studio Header & Telemetry Banner */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-[#0b0f20] via-[#0f1730] to-[#0b0f20] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-0.5 text-xs font-bold text-orange-300">
                <Sparkles className="h-3.5 w-3.5" />
                OxenGL Enterprise Design System
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-black text-emerald-300">
                SCHEMA RLS L3 CERTIFIED
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl lg:text-4xl">
              Multi-Tenant Design System & AI UI Studio
            </h1>
            <p className="mt-2 max-w-2xl text-xs text-slate-300 sm:text-sm">
              Deep-dark enterprise aesthetics, tenant-aware white-labeling across 11 color palettes,
              density switching (Comfortable vs Compact), modular card architectures, and strict isolation telemetry.
            </p>
          </div>

          {/* Quick Studio Controls */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-xl">
            <button
              type="button"
              onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              <span>{isDark ? 'Dark Enterprise' : 'Light Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDensityMode(densityMode === 'comfortable' ? 'compact' : 'comfortable')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white"
            >
              {densityMode === 'comfortable' ? (
                <>
                  <Rows3 className="h-4 w-4 text-indigo-400" />
                  <span>Comfortable</span>
                </>
              ) : (
                <>
                  <Rows4 className="h-4 w-4 text-amber-400" />
                  <span>Compact Grid</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Live Isolation Telemetry HUD */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <IsolationTelemetryBadge variant="banner" />
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/50 px-2 py-1.5 text-xs font-bold">
        {[
          { id: 'overview', label: '1. Architecture Overview', icon: LayoutGrid },
          { id: 'themes', label: '2. 11 Tenant Palettes', icon: Palette },
          { id: 'cards', label: '3. Modular Bento Cards', icon: Layers },
          { id: 'grid', label: '4. Master-Detail Grid', icon: FileSpreadsheet },
          { id: 'workflow', label: '5. Workflow Automation Canvas', icon: Cpu },
          { id: 'ai-prompt-gen', label: '6. AI UI Prompt Generator', icon: Code2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
                active
                  ? 'border border-orange-500/40 bg-orange-500/15 font-black text-orange-300 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <BentoCard
              title="Deep-Dark Enterprise Aesthetics"
              subtitle="OxenGL Midnight Identity"
              icon={Moon}
              glow
            >
              <p className="text-xs leading-relaxed text-slate-300">
                Utilizes deep navy/midnight gradients (<code className="text-amber-300">#0b0d19</code> to{' '}
                <code className="text-amber-300">#111322</code>), frosted slate containers (<code className="text-amber-300">#141726</code>),
                1px subtle luminous borders, and glowing neon accents (amber, orange, emerald).
              </p>
            </BentoCard>

            <BentoCard
              title="Tenant-Aware White-Labeling"
              subtitle="11 Distinct Color Palettes"
              icon={Palette}
            >
              <p className="text-xs leading-relaxed text-slate-300">
                Supports individual tenant configurations: Gray, Yellow, Orange, Red, Pink, Purple, Violet, Blue, Green, Cyan, and System auto-matching. Injects dynamic CSS variables for bespoke branding.
              </p>
            </BentoCard>

            <BentoCard
              title="Strict Isolation Telemetry"
              subtitle="Schema RLS L3 Assurance"
              icon={ShieldCheck}
            >
              <p className="text-xs leading-relaxed text-slate-300">
                Visual telemetry indicators communicating connected tenants, 12ms network latency, ZATCA Phase-2 readiness, and strict multi-tenant boundary locks for zero cross-tenant data leaks.
              </p>
            </BentoCard>
          </div>

          <IsolationTelemetryBadge variant="full" />
        </div>
      )}

      {/* Tab 2: 11 Tenant Color Themes */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">
                  Interactive Tenant White-Labeling Palettes (11 Supported Themes)
                </h3>
                <p className="text-xs text-slate-400">
                  Click any palette to instantly re-theme the entire application and inspect its live visual tokens.
                </p>
              </div>
              <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-400">
                Active Theme: {activePalette.nameEn}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paletteList.map((pal) => {
                const isSelected = tenantTheme === pal.id;
                return (
                  <button
                    key={pal.id}
                    onClick={() => setTenantTheme(pal.id)}
                    style={{ borderColor: isSelected ? pal.primary : undefined }}
                    className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 shadow-xl ring-2'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className="h-6 w-6 rounded-xl border border-white/20 shadow-md"
                          style={{ backgroundColor: pal.primary }}
                        />
                        {isSelected && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950"
                            style={{ backgroundColor: pal.primary }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 text-sm font-black text-white">{pal.nameEn}</h4>
                      <p className="text-[11px] text-slate-400">{pal.nameAr}</p>
                      <p className="mt-2 text-[10px] leading-snug text-slate-400">
                        {pal.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-2 font-mono text-[10px] text-slate-400">
                      <span>Primary: {pal.primary}</span>
                      <span className="rounded px-1.5 py-0.5" style={{ color: pal.badgeText, backgroundColor: pal.badgeBg }}>
                        Accent
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Modular Bento Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <BentoCard
              title="Quarry Material Revenue"
              subtitle="Aggregated Sales Invoices"
              icon={Landmark}
              glow
              badge={
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  +14.2% MoM
                </span>
              }
            >
              <div className="space-y-2">
                <span className="font-mono text-3xl font-black text-white">SAR 482,910.00</span>
                <p className="text-xs text-slate-400">
                  Live revenue counters with cryptographic isolation barrier verified.
                </p>
              </div>
            </BentoCard>

            <BentoCard
              title="Weighbridge Loss & Shrinkage"
              subtitle="Scale Ticket Audit"
              icon={Scale}
              badge={
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  0.48% Loss
                </span>
              }
            >
              <div className="space-y-2">
                <span className="font-mono text-3xl font-black text-amber-400">12.4 MT</span>
                <p className="text-xs text-slate-400">
                  Tolerance controlled across 18 partner transporters and quarries.
                </p>
              </div>
            </BentoCard>

            <BentoCard
              title="Fleet Logistics Trips"
              subtitle="Daily Active Dispatch"
              icon={Truck}
              badge={
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  148 Trips
                </span>
              }
            >
              <div className="space-y-2">
                <span className="font-mono text-3xl font-black text-white">3,892.4 MT</span>
                <p className="text-xs text-slate-400">
                  Aggregate base, subbase, and crushed rock delivered today.
                </p>
              </div>
            </BentoCard>
          </div>
        </div>
      )}

      {/* Tab 4: Master-Detail Grid */}
      {activeTab === 'grid' && (
        <div className="space-y-6">
          <MasterDetailDataGrid
            data={sampleOperations}
            columns={sampleColumns}
            title="Weighbridge & Daily Dispatch Logs"
            subtitle="Click any row to open the slide-out side-sheet inspector"
            detailRenderer={(op, onClose) => (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-[10px] font-mono text-slate-400">Scale Ticket #</p>
                  <p className="font-mono text-base font-black text-amber-400">
                    {op.scale_ticket_no}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <div className="flex justify-between border-b border-slate-800/50 py-1.5">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-white">{op.destination_customer}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/50 py-1.5">
                    <span className="text-slate-400">Crusher Quarry:</span>
                    <span className="font-bold text-white">{op.loading_source}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/50 py-1.5">
                    <span className="text-slate-400">Loaded Weight:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {op.qty_loaded} MT
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/50 py-1.5">
                    <span className="text-slate-400">Delivered Weight:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {op.qty_delivered} MT
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Wastage / Shrinkage:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {op.wastage_percentage?.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Schema RLS L3 Security Seal</span>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-300/80">
                    This ticket record is strictly isolated to tenant ID:{' '}
                    <code className="font-mono">{currentCompany?.id || 'TENANT-001'}</code>
                  </p>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Tab 5: Workflow Automation Builder */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <WorkflowAutomationCanvas />
        </div>
      )}

      {/* Tab 6: AI UI Prompt Generator */}
      {activeTab === 'ai-prompt-gen' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Prompt Selector & Specs */}
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#0d1222] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-orange-400" />
              <h3 className="text-base font-black text-white">
                AI Layout & Telemetry Prompt Generator
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Select an enterprise ERP UI module below to generate copyable prompts and production-ready React components that enforce strict tenant isolation and deep-dark aesthetics.
            </p>

            <div className="space-y-2">
              {Object.entries(aiPrompts).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPromptModule(key)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    selectedPromptModule === key
                      ? 'border-orange-500 bg-orange-500/15 text-orange-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{item.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  Target AI Assistant Prompt
                </span>
                <button
                  onClick={() => handleCopyCode(aiPrompts[selectedPromptModule].prompt)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
                {aiPrompts[selectedPromptModule].prompt}
              </pre>
            </div>
          </div>

          {/* Sample Code Output */}
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#0d1222] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">Generated React Component Code</h3>
              </div>
              <button
                onClick={() => handleCopyCode(aiPrompts[selectedPromptModule].sampleCode)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-emerald-300">
                {aiPrompts[selectedPromptModule].sampleCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
