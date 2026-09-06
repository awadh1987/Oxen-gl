import React from 'react';
import { WorkflowAutomationCanvas } from '../components/design-system/WorkflowAutomationCanvas';
import { IsolationTelemetryBadge } from '../components/design-system/IsolationTelemetryBadge';
import { BentoCard } from '../components/design-system/BentoCard';
import { Sparkles, ShieldCheck, Zap, GitBranch, Cpu, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WorkflowAutomationView: React.FC = () => {
  const { themeMode } = useApp();
  const isDark = themeMode === 'dark';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-0.5 text-xs font-bold text-orange-300">
              <Zap className="h-3.5 w-3.5" />
              Business Logic Automation Engine
            </span>
            <IsolationTelemetryBadge variant="pill" />
          </div>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Workflow & Process Automation Builder
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Configure cross-departmental approval chains, real-time dispatch triggers, and automated ZATCA tax invoice generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-slate-400 sm:inline-block">
            Engine Latency: <b className="text-emerald-400">12ms</b>
          </span>
        </div>
      </div>

      {/* Main Full-Screen Node Automation Canvas */}
      <WorkflowAutomationCanvas />

      {/* Capabilities & Automation Rules Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard
          title="Trip Dispatch to Scale Ticket"
          subtitle="Real-time Logistics Sync"
          icon={GitBranch}
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            When a haulage truck arrives at a partner quarry, tare weight and destination are locked automatically. Deviation triggers audit alerts.
          </p>
        </BentoCard>

        <BentoCard
          title="Scale Ticket to ZATCA Tax Invoice"
          subtitle="Phase-2 Cryptographic Auto-Issue"
          icon={ShieldCheck}
          glow
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            Upon gross weight verification, net tonnage is priced using active customer rate sheets and submitted for ZATCA Phase-2 cryptographic signing.
          </p>
        </BentoCard>

        <BentoCard
          title="Payment Clearance & Ledger Posting"
          subtitle="Autonomous Dual-Entry Reconciliation"
          icon={Cpu}
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            Financial vouchers automatically balance quarry supplier payables and transporter net settlements with verified bank transfer references.
          </p>
        </BentoCard>
      </div>
    </div>
  );
};
