import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BanknoteArrowUp, CircleCheck, ReceiptText, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiSettlement, erpApi } from '../services/api';
import { formatCurrency, formatTonnage } from '../utils/formatters';

type Partner = { id: string; name: string; partner_type: string };

export const TransporterPerformanceView: React.FC = () => {
  const { currentCompany, language, accessibleOperations, transporters } = useApp();
  const isAr = language === 'ar';
  const [serverSettlements, setServerSettlements] = useState<ApiSettlement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    if (!currentCompany) return;
    Promise.all([erpApi.getSettlements(currentCompany.id), erpApi.getPartners(currentCompany.id)])
      .then(([settlements, records]) => { setServerSettlements(settlements); setPartners(records); })
      .catch((error) => console.warn('Settlement ledger unavailable; displaying operational fallback:', error));
  }, [currentCompany]);

  const rows = useMemo(() => {
    const serviceSuppliers = partners.filter((partner) => ['service_supplier', 'transporter'].includes(partner.partner_type));
    const source = serviceSuppliers.length ? serviceSuppliers.map((partner) => {
      const settlement = serverSettlements.find((item) => item.partner_id === partner.id);
      const operations = accessibleOperations.filter((item) => item.transporter_name.includes(partner.name));
      const loaded = operations.reduce((total, item) => total + item.qty_loaded, 0);
      const delivered = operations.reduce((total, item) => total + item.qty_delivered, 0);
      const wastage = loaded - delivered;
      const gross = settlement ? Number(settlement.total_gross_amount) : delivered * 18;
      const penalties = settlement ? Number(settlement.total_penalties_loss) : Math.max(0, wastage) * 44;
      return { id: partner.id, name: partner.name, trips: operations.length, loaded, delivered, wastage, loss: loaded ? (wastage / loaded) * 100 : 0, gross, penalties, payout: settlement ? Number(settlement.net_payable) : Math.max(0, gross - penalties), voucher: settlement?.move_id, compliance: wastage / (loaded || 1) > .02 ? 'Warning' : 'Excellent' };
    }) : transporters.map((supplier) => {
      const operations = accessibleOperations.filter((item) => item.transporter_name.includes(supplier.transporterName));
      const loaded = operations.reduce((total, item) => total + item.qty_loaded, 0); const delivered = operations.reduce((total, item) => total + item.qty_delivered, 0); const wastage = loaded - delivered; const gross = delivered * (supplier.ratePerTon || 18); const penalties = Math.max(0, wastage) * 44;
      return { id: supplier.id, name: supplier.transporterName, trips: operations.length, loaded, delivered, wastage, loss: loaded ? wastage / loaded * 100 : 0, gross, penalties, payout: Math.max(0, gross - penalties), compliance: wastage / (loaded || 1) > .02 ? 'Warning' : 'Excellent' };
    });
    return source;
  }, [accessibleOperations, partners, serverSettlements, transporters]);

  const totals = rows.reduce((all, row) => ({ loss: all.loss + row.wastage, gross: all.gross + row.gross, penalties: all.penalties + row.penalties, payout: all.payout + row.payout }), { loss: 0, gross: 0, penalties: 0, payout: 0 });
  const cards = [
    { title: 'Total Route Loss', value: formatTonnage(totals.loss, language), tone: 'text-rose-600', icon: AlertTriangle },
    { title: 'Gross Freight Fees', value: formatCurrency(totals.gross, language), tone: 'text-slate-900', icon: Truck },
    { title: 'Wastage Deductions', value: formatCurrency(totals.penalties, language), tone: 'text-orange-600', icon: BanknoteArrowUp },
    { title: 'Net Freight Payable', value: formatCurrency(totals.payout, language), tone: 'text-emerald-600', icon: ReceiptText },
  ];

  return <div className="space-y-5" id="transporter-performance-view">
    <header className="border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">Operational ledger</p><h1 className="mt-1 text-xl font-black text-slate-950">Carrier Loss & Freight Settlements</h1><p className="mt-1 text-xs text-slate-500">Audit transit material losses, flag abnormal weighbridge variance, and settle freight fees.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.title} className="border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{card.title}</span><Icon className={`h-4 w-4 ${card.tone}`} /></div><strong className={`mt-3 block text-xl font-black ${card.tone}`}>{card.value}</strong></article>; })}</section>
    <section className="overflow-hidden border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Subcontractor Freight Settlement & Compliance</h2><p className="mt-1 text-[11px] text-slate-500">Live tenant settlement data · {currentCompany?.name || 'No active company'}</p></div><span className="text-xs font-bold text-slate-500">{rows.length} suppliers</span></div><div className="overflow-x-auto"><table className="min-w-[1160px] w-full text-right text-xs"><thead className="bg-slate-900 text-white"><tr>{['#', 'Supplier Name', 'Trips', 'Loaded', 'Delivered', 'Wastage', 'Loss %', 'Freight Fee', 'Penalties', 'Net Payout', 'Compliance', 'Action'].map((label) => <th key={label} className="px-3 py-3 text-center font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-3 py-3 text-center font-mono">{index + 1}</td><td className="px-3 py-3 font-bold text-slate-900">{row.name}</td><td className="px-3 py-3 text-center">{row.trips}</td><td className="px-3 py-3 text-center">{formatTonnage(row.loaded, language)}</td><td className="px-3 py-3 text-center font-bold">{formatTonnage(row.delivered, language)}</td><td className="px-3 py-3 text-center text-rose-600">{formatTonnage(row.wastage, language)}</td><td className="px-3 py-3 text-center">{row.loss.toFixed(2)}%</td><td className="px-3 py-3">{formatCurrency(row.gross, language)}</td><td className="px-3 py-3 font-bold text-orange-600">{formatCurrency(row.penalties, language)}</td><td className="px-3 py-3 font-black text-emerald-700">{formatCurrency(row.payout, language)}</td><td className="px-3 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${row.compliance === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><CircleCheck className="h-3 w-3" />{row.compliance}</span></td><td className="px-3 py-3 text-center">{row.voucher ? <button className="border border-orange-300 px-2 py-1 text-[10px] font-bold text-orange-700">PV-2026-{row.voucher.slice(0, 5)}</button> : <button className="bg-orange-600 px-2.5 py-1.5 text-[10px] font-bold text-white">Issue Voucher</button>}</td></tr>)}{!rows.length && <tr><td colSpan={12} className="px-4 py-10 text-center text-slate-400">No service suppliers or settlements found for this company.</td></tr>}</tbody></table></div></section>
    <button onClick={() => window.dispatchEvent(new Event('oxengl-open-ai'))} title="AI Operations Auditor" className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:brightness-110"><Sparkles className="h-5 w-5" /></button>
  </div>;
};
