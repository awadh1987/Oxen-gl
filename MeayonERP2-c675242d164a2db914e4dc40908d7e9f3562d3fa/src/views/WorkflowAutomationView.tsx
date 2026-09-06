import React from 'react';
import { WorkflowAutomationCanvas } from '../components/design-system/WorkflowAutomationCanvas';
import { IsolationTelemetryBadge } from '../components/design-system/IsolationTelemetryBadge';
import { BentoCard } from '../components/design-system/BentoCard';
import { Sparkles, ShieldCheck, Zap, GitBranch, Cpu, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WorkflowAutomationView: React.FC = () => {
  const { themeMode, language } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';

  return (
    <div className="space-y-6 pb-12" id="workflow-automation-view">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-0.5 text-xs font-bold text-orange-400 dark:text-orange-300">
              <Zap className="h-3.5 w-3.5" />
              {isAr ? 'محرك أتمتة منطق الأعمال' : 'Business Logic Automation Engine'}
            </span>
            <IsolationTelemetryBadge variant="pill" />
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {isAr ? 'أداة بناء وأتمتة مسارات العمليات التشغيلية' : 'Workflow & Process Automation Builder'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            {isAr
              ? 'تكوين سلاسل الموافقات بين الأقسام، وإجراءات الترحيل الفورية، وإصدار الفواتير الضريبية المعتمدة من هيئة الزكاة تلقائياً.'
              : 'Configure cross-departmental approval chains, real-time dispatch triggers, and automated ZATCA tax invoice generation.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-slate-600 dark:text-slate-400 sm:inline-block">
            {isAr ? 'زمن استجابة المحرك: ' : 'Engine Latency: '}
            <b className="text-emerald-600 dark:text-emerald-400">12ms</b>
          </span>
        </div>
      </div>

      {/* Main Full-Screen Node Automation Canvas */}
      <WorkflowAutomationCanvas />

      {/* Capabilities & Automation Rules Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard
          title={isAr ? 'الترحيل اللوجستي إلى تذكرة الميزان' : 'Trip Dispatch to Scale Ticket'}
          subtitle={isAr ? 'مزامنة لوجستية فورية' : 'Real-time Logistics Sync'}
          icon={GitBranch}
        >
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? 'عند وصول شاحنة النقل إلى المحجر الشريك، يتم قفل الوزن الفارغ والوجهة تلقائياً. أي انحراف في الأوزان يطلق تنبيهات تدقيق فورية.'
              : 'When a haulage truck arrives at a partner quarry, tare weight and destination are locked automatically. Deviation triggers audit alerts.'}
          </p>
        </BentoCard>

        <BentoCard
          title={isAr ? 'تذكرة الميزان إلى فاتورة هيئة الزكاة' : 'Scale Ticket to ZATCA Tax Invoice'}
          subtitle={isAr ? 'إصدار مشفر تلقائي للمرحلة الثانية' : 'Phase-2 Cryptographic Auto-Issue'}
          icon={ShieldCheck}
          glow
        >
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? 'بمجرد التحقق من الوزن الإجمالي، يتم احتساب الحمولة الصافية بأسعار التعاقد الفعالة وإرسالها للتوقيع الرقمي المشفر بهيئة الزكاة والضريبة والجمارك.'
              : 'Upon gross weight verification, net tonnage is priced using active customer rate sheets and submitted for ZATCA Phase-2 cryptographic signing.'}
          </p>
        </BentoCard>

        <BentoCard
          title={isAr ? 'تسوية المدفوعات والترحيل لدفتر الأستاذ' : 'Payment Clearance & Ledger Posting'}
          subtitle={isAr ? 'مطابقة قيد مزدوج ذاتية التسيير' : 'Autonomous Dual-Entry Reconciliation'}
          icon={Cpu}
        >
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? 'سندات القبض والصرف المالية توازن تلقائياً مستحقات موردي المحاجر وتسويات ناقلي البضائع مع مراجع التحويلات البنكية المعتمدة.'
              : 'Financial vouchers automatically balance quarry supplier payables and transporter net settlements with verified bank transfer references.'}
          </p>
        </BentoCard>
      </div>
    </div>
  );
};

