import React, { useState } from 'react';
import {
  ShoppingCart,
  Boxes,
  FileCheck2,
  ShieldCheck,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

interface MockPO {
  id: string;
  poNumber: string;
  vendorName: string;
  category: string;
  totalAmount: number;
  currency: string;
  status: 'APPROVED' | 'PENDING' | 'MATCHED' | 'DISCREPANCY';
  issueDate: string;
  deliveryDate: string;
}

export const ProcurementView: React.FC = () => {
  const { language, themeMode } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'orders' | 'matching' | 'vendors'>('orders');
  const [searchTerm, setSearchTerm] = useState('');

  const [purchaseOrders] = useState<MockPO[]>([
    {
      id: 'po-101',
      poNumber: 'PO-2026-0089',
      vendorName: isAr ? 'مورد الصخور والركام العربي' : 'Arabian Aggregates Co.',
      category: isAr ? 'مواد خام' : 'Raw Materials',
      totalAmount: 185000,
      currency: 'SAR',
      status: 'MATCHED',
      issueDate: '2026-09-02',
      deliveryDate: '2026-09-15',
    },
    {
      id: 'po-102',
      poNumber: 'PO-2026-0094',
      vendorName: isAr ? 'شركة خدمات الصيانة الثقيلة' : 'Heavy Fleet Services Ltd.',
      category: isAr ? 'قطع غيار وصيانة' : 'Maintenance & Parts',
      totalAmount: 42800,
      currency: 'SAR',
      status: 'APPROVED',
      issueDate: '2026-09-08',
      deliveryDate: '2026-09-20',
    },
    {
      id: 'po-103',
      poNumber: 'PO-2026-0099',
      vendorName: isAr ? 'مؤسسة إمدادات السلامة الميدانية' : 'Field Safety Supplies Est.',
      category: isAr ? 'مهمات السلامة والمستهلكات' : 'Safety Consumables',
      totalAmount: 16500,
      currency: 'SAR',
      status: 'PENDING',
      issueDate: '2026-09-18',
      deliveryDate: '2026-09-25',
    },
  ]);

  const filteredOrders = purchaseOrders.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="procurement-view">
      {/* Top Header Card */}
      <div
        className={`flex flex-col justify-between gap-4 rounded-3xl border p-6 shadow-xs transition-colors sm:flex-row sm:items-center ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-[#F05627]">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'المشتريات وسلسلة التوريد (Procurement & S2P)' : 'Procurement & S2P Management'}
              </h1>
              <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-black text-[#F05627]">
                3-Way Match Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'إدارة أوامر الشراء، مطابقة الفواتير مع أذون الاستلام المخزني (GRN)، وإدارة عقود الموردين'
                : 'Manage Purchase Requisitions, POs, Goods Receipts (GRN), and Automated 3-Way Invoice Matching'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{isAr ? 'أمر شراء جديد' : 'New Purchase Order'}</span>
        </button>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'إجمالي المشتريات المعتمدة' : 'Total Approved POs'}
          </span>
          <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            {formatCurrency(244300, language)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'أوامر قيد المطابقة والتسوية' : 'Pending 3-Way Match'}
          </span>
          <p className="mt-1 text-lg font-black text-amber-600">1 {isAr ? 'أمر' : 'PO'}</p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'نسبة الامتثال للأسعار' : 'Price Variance Rate'}
          </span>
          <p className="mt-1 text-lg font-black text-emerald-600">0.4%</p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'الموردين المعتمدين' : 'Active Vendors'}
          </span>
          <p className="mt-1 text-lg font-black text-orange-600">18 {isAr ? 'مورد' : 'Vendors'}</p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white dark:bg-orange-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'أوامر الشراء (POs)' : 'Purchase Orders'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matching')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'matching'
                ? 'bg-slate-900 text-white dark:bg-orange-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'محرك المطابقة الثلاثية (3-Way Match)' : '3-Way Match Engine'}
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم الأمر أو المورد...' : 'Search PO number or vendor...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-9 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Main Table View */}
      <div
        className={`rounded-3xl border shadow-xs overflow-hidden ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr
                className={`border-b font-black ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/60 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <th className="py-3 px-4">{isAr ? 'رقم أمر الشراء' : 'PO Number'}</th>
                <th className="py-3 px-4">{isAr ? 'المورد' : 'Vendor'}</th>
                <th className="py-3 px-4">{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'حالة المطابقة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map((po) => (
                <tr
                  key={po.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {po.poNumber}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {po.vendorName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{po.category}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                    {formatCurrency(po.totalAmount, language)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-500">{po.issueDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        po.status === 'MATCHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : po.status === 'APPROVED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {po.status === 'MATCHED' && <CheckCircle2 className="h-3 w-3" />}
                      {po.status === 'PENDING' && <AlertCircle className="h-3 w-3" />}
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
