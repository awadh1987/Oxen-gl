import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiAccountMove, ApiSettlement, erpApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';

type Partner = { id: string; name: string; partner_type: string; tax_number?: string | null };

export const CrusherLedgerView: React.FC = () => {
  const { currentCompany, language, crushers, accessibleOperations, themeMode } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';
  const [partners, setPartners] = useState<Partner[]>([]);
  const [moves, setMoves] = useState<ApiAccountMove[]>([]);
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!currentCompany) return;
    Promise.all([
      erpApi.getPartners(currentCompany.id),
      erpApi.getAccountingMoves(currentCompany.id),
      erpApi.getSettlements(currentCompany.id),
    ])
      .then(([records, ledgerMoves, ledgerSettlements]) => {
        setPartners(records);
        setMoves(ledgerMoves);
        setSettlements(ledgerSettlements);
      })
      .catch((error) => console.warn('Sourcing ledger API unavailable; using operational fallback:', error));
  }, [currentCompany]);

  const suppliers = useMemo(() => {
    const apiSuppliers = partners.filter((partner) =>
      ['raw_materials_supplier', 'supplier'].includes(partner.partner_type)
    );
    return apiSuppliers.length
      ? apiSuppliers.map((partner) => ({
          id: partner.id,
          name: partner.name,
          location: isAr ? 'منطقة توريد المستأجر' : 'Tenant sourcing region',
          tax: partner.tax_number,
        }))
      : crushers.map((supplier) => ({
          id: supplier.id,
          name: supplier.crusherName,
          location: supplier.location,
          tax: supplier.taxNumber,
        }));
  }, [partners, crushers, isAr]);

  const selected = suppliers.find((supplier) => supplier.id === selectedId) || suppliers[0];

  const purchaseFor = (id: string, name: string) => {
    const settlement = settlements.filter((item) => item.partner_id === id);
    if (settlement.length) return settlement.reduce((total, item) => total + Number(item.total_gross_amount), 0);
    return accessibleOperations
      .filter((item) => item.loading_source.includes(name))
      .reduce((total, item) => total + item.purchases_cost, 0);
  };

  const paymentFor = (id: string) =>
    settlements
      .filter((item) => item.partner_id === id && item.state === 'paid')
      .reduce((total, item) => total + Number(item.net_payable), 0);

  const purchases = selected ? purchaseFor(selected.id, selected.name) : 0;
  const payments = selected ? paymentFor(selected.id) : 0;
  const outstanding = purchases - payments;
  const supplierMoves = selected ? moves.filter((move) => move.partner_id === selected.id) : [];

  return (
    <div className="space-y-5" id="crusher-ledger-view">
      {/* Header Banner */}
      <header
        className={`rounded-2xl border p-5 shadow-xs transition-colors ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200 bg-white'
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">
          {isAr ? 'دفتر توريد المواد الخام' : 'Sourcing Ledger'}
        </p>
        <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
          {isAr ? 'حسابات كسارات ومقالع المواد الحصوية' : 'Raw Material Payables & Accounts Ledger'}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isAr
            ? 'متابعة مشتريات المواد الخام، سندات الصرف الدائنة، ومطابقة الأرصدة المستحقة للمقالع.'
            : 'Track raw material purchases, supplier debit vouchers, and outstanding balances.'}
        </p>
      </header>

      {/* Sourcing Supplier Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((supplier) => {
          const suppPurchases = purchaseFor(supplier.id, supplier.name);
          const suppOutstanding = suppPurchases - paymentFor(supplier.id);
          const active = selected?.id === supplier.id;
          return (
            <button
              key={supplier.id}
              onClick={() => setSelectedId(supplier.id)}
              className={`rounded-2xl border p-5 text-start shadow-xs transition-all ${
                active
                  ? isDark
                    ? 'border-orange-500 bg-orange-950/30 ring-1 ring-orange-500/50'
                    : 'border-orange-400 bg-orange-50/60 ring-1 ring-orange-300'
                  : isDark
                  ? 'border-slate-800 bg-[#141726] hover:border-slate-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-orange-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {isAr ? 'مورد خام' : 'Raw Materials'}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-black text-slate-900 dark:text-slate-100">{supplier.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{supplier.location}</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{isAr ? 'المشتريات:' : 'Purchases:'}</span>
                  <strong className="mt-1 block font-mono text-slate-900 dark:text-slate-100">
                    {formatCurrency(suppPurchases, language)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{isAr ? 'الرصيد القائم:' : 'Outstanding:'}</span>
                  <strong className="mt-1 block font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(suppOutstanding, language)}
                  </strong>
                </div>
              </div>
            </button>
          );
        })}
        {!suppliers.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-400">
            {isAr ? 'لا يوجد موردين أو كسارات مسجلة لهذا المستأجر.' : 'No raw materials suppliers are available for this tenant.'}
          </div>
        )}
      </section>

      {/* Detailed Supplier Statement */}
      {selected && (
        <section
          className={`rounded-2xl border shadow-xs transition-colors ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex rounded-md border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                {isAr ? 'كشف حساب مورد معتمد' : 'Verified Supplier Statement'}
              </span>
              <h2 className="mt-1.5 text-base font-black text-slate-900 dark:text-white">{selected.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {selected.location} · {selected.tax || (isAr ? 'الرقم الضريبي قيد التوثيق' : 'Tax number pending')}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {supplierMoves.length} {isAr ? 'حركة مالية ومحاسبية' : 'accounting moves'}
            </span>
          </div>

          <div className="grid gap-3 border-b border-slate-100 dark:border-slate-800 p-5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي المشتريات (دائن)' : 'Total Purchases (Credit)'}
              </span>
              <strong className="mt-2 block font-mono text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(purchases, language)}
              </strong>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي السدادات (مدين)' : 'Total Payments (Debit)'}
              </span>
              <strong className="mt-2 block font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(payments, language)}
              </strong>
            </div>
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                {isAr ? 'صافي الرصيد المستحق (مطلوب)' : 'Net Outstanding Balance'}
              </span>
              <strong className="mt-2 block font-mono text-xl font-black text-rose-700 dark:text-rose-400">
                {formatCurrency(outstanding, language)}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-start text-xs">
              <thead className="bg-slate-900 dark:bg-slate-950 text-white">
                <tr>
                  {(isAr
                    ? ['التاريخ', 'رقم القيد', 'المرجع', 'الحالة', 'اسم المورد', 'المبلغ المستحق']
                    : ['Date', 'Move', 'Reference', 'State', 'Supplier', 'Amount']
                  ).map((label) => (
                    <th key={label} className="px-4 py-3 font-bold text-start">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supplierMoves.map((move) => {
                  const settlement = settlements.find((item) => item.move_id === move.id);
                  return (
                    <tr
                      key={move.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-slate-800 dark:text-slate-200"
                    >
                      <td className="px-4 py-3">{move.date.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-orange-600 dark:text-orange-400">
                        {move.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{move.ref || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            move.state === 'posted'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {move.state === 'posted' ? (isAr ? 'معتمد' : 'Posted') : (isAr ? 'مسودة' : 'Draft')}
                        </span>
                      </td>
                      <td className="px-4 py-3">{selected.name}</td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {settlement ? formatCurrency(Number(settlement.net_payable), language) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {!supplierMoves.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      {isAr
                        ? 'لا توجد حركات محاسبية مسجلة لهذا المورد حالياً.'
                        : 'No accounting movements are available for this supplier.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Floating AI Insights Action Button */}
      <button
        onClick={() => window.dispatchEvent(new Event('oxengl-open-ai'))}
        title={isAr ? 'ذكاء العمليات المحاسبية' : 'AI Operations Auditor'}
        className="fixed bottom-6 end-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:brightness-110 transition-all"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </div>
  );
};

