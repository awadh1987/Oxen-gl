import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiAccountMove, ApiSettlement, erpApi } from '../services/api';
import { formatCurrency } from '../utils/formatters';

type Partner = { id: string; name: string; partner_type: string; tax_number?: string | null };

export const CrusherLedgerView: React.FC = () => {
  const { currentCompany, language, crushers, accessibleOperations } = useApp();
  const isAr = language === 'ar';
  const [partners, setPartners] = useState<Partner[]>([]);
  const [moves, setMoves] = useState<ApiAccountMove[]>([]);
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!currentCompany) return;
    Promise.all([erpApi.getPartners(currentCompany.id), erpApi.getAccountingMoves(currentCompany.id), erpApi.getSettlements(currentCompany.id)])
      .then(([records, ledgerMoves, ledgerSettlements]) => { setPartners(records); setMoves(ledgerMoves); setSettlements(ledgerSettlements); })
      .catch((error) => console.warn('Sourcing ledger API unavailable; using operational fallback:', error));
  }, [currentCompany]);

  const suppliers = useMemo(() => {
    const apiSuppliers = partners.filter((partner) => ['raw_materials_supplier', 'supplier'].includes(partner.partner_type));
    return apiSuppliers.length ? apiSuppliers.map((partner) => ({ id: partner.id, name: partner.name, location: 'Tenant sourcing region', tax: partner.tax_number })) : crushers.map((supplier) => ({ id: supplier.id, name: supplier.crusherName, location: supplier.location, tax: supplier.taxNumber }));
  }, [partners, crushers]);

  const selected = suppliers.find((supplier) => supplier.id === selectedId) || suppliers[0];
  const purchaseFor = (id: string, name: string) => {
    const settlement = settlements.filter((item) => item.partner_id === id);
    if (settlement.length) return settlement.reduce((total, item) => total + Number(item.total_gross_amount), 0);
    return accessibleOperations.filter((item) => item.loading_source.includes(name)).reduce((total, item) => total + item.purchases_cost, 0);
  };
  const paymentFor = (id: string) => settlements.filter((item) => item.partner_id === id && item.state === 'paid').reduce((total, item) => total + Number(item.net_payable), 0);
  const purchases = selected ? purchaseFor(selected.id, selected.name) : 0;
  const payments = selected ? paymentFor(selected.id) : 0;
  const outstanding = purchases - payments;
  const supplierMoves = selected ? moves.filter((move) => move.partner_id === selected.id) : [];

  return <div className="space-y-5" id="crusher-ledger-view">
    <header className="border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">Sourcing ledger</p><h1 className="mt-1 text-xl font-black text-slate-950">Raw Material Payables & Accounts Ledger</h1><p className="mt-1 text-xs text-slate-500">Track raw material purchases, supplier debit vouchers, and outstanding balances.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => { const purchases = purchaseFor(supplier.id, supplier.name); const outstanding = purchases - paymentFor(supplier.id); const active = selected?.id === supplier.id; return <button key={supplier.id} onClick={() => setSelectedId(supplier.id)} className={`border p-5 text-left shadow-sm transition-colors ${active ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center bg-slate-900 text-orange-300"><Building2 className="h-4 w-4" /></div><span className="text-[10px] font-bold text-slate-400">RAW MATERIALS</span></div><h2 className="mt-4 text-sm font-black text-slate-900">{supplier.name}</h2><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" />{supplier.location}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs"><div><span className="text-slate-500">Purchases:</span><strong className="mt-1 block text-slate-900">{formatCurrency(purchases, language)}</strong></div><div><span className="text-slate-500">Outstanding:</span><strong className="mt-1 block text-rose-600">{formatCurrency(outstanding, language)}</strong></div></div></button>; })}{!suppliers.length && <div className="border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No raw materials suppliers are available for this tenant.</div>}</section>
    {selected && <section className="border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="inline-flex border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Verified Supplier Statement</span><h2 className="mt-2 text-base font-black text-slate-900">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{selected.location} · {selected.tax || 'Tax number pending'}</p></div><span className="text-xs text-slate-500">{supplierMoves.length} accounting moves</span></div><div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3"><div className="border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-bold text-slate-500">Total Purchases (Credit)</span><strong className="mt-2 block text-xl font-black text-slate-900">{formatCurrency(purchases, language)}</strong></div><div className="border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-bold text-slate-500">Total Payments (Debit)</span><strong className="mt-2 block text-xl font-black text-emerald-700">{formatCurrency(payments, language)}</strong></div><div className="border border-rose-200 bg-rose-50/60 p-4"><span className="text-xs font-bold text-rose-700">Net Outstanding Balance</span><strong className="mt-2 block text-xl font-black text-rose-700">{formatCurrency(outstanding, language)}</strong></div></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-right text-xs"><thead className="bg-slate-900 text-white"><tr>{['Date', 'Move', 'Reference', 'State', 'Supplier', 'Amount'].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{supplierMoves.map((move) => { const settlement = settlements.find((item) => item.move_id === move.id); return <tr key={move.id} className="hover:bg-slate-50"><td className="px-4 py-3">{move.date.slice(0, 10)}</td><td className="px-4 py-3 font-mono font-bold">{move.name}</td><td className="px-4 py-3 text-slate-500">{move.ref || '-'}</td><td className="px-4 py-3"><span className={move.state === 'posted' ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>{move.state}</span></td><td className="px-4 py-3">{selected.name}</td><td className="px-4 py-3 font-bold">{settlement ? formatCurrency(Number(settlement.net_payable), language) : '-'}</td></tr>; })}{!supplierMoves.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No accounting movements are available for this supplier.</td></tr>}</tbody></table></div></section>}
    <button onClick={() => window.dispatchEvent(new Event('oxengl-open-ai'))} title="AI Operations Auditor" className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:brightness-110"><Sparkles className="h-5 w-5" /></button>
  </div>;
};
