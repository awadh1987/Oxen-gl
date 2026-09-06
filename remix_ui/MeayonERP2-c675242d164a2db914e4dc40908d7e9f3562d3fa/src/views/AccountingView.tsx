import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Account, AccountType, JournalEntry, JournalLine } from '../types';
import { CreateAccountModal } from '../components/CreateAccountModal';
import { CreateJournalEntryModal } from '../components/CreateJournalEntryModal';
import {
  Landmark,
  Plus,
  Scale,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Calendar,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

type AccountingTab = 'coa' | 'journal' | 'trial-balance' | 'income-statement' | 'balance-sheet' | 'ledger';

export const AccountingView: React.FC = () => {
  const {
    accounts,
    journalEntries,
    getAccountCalculatedBalance,
    getTrialBalance,
    getIncomeStatement,
    getBalanceSheet,
    getAccountLedger,
    postJournalEntry,
    cancelOrDraftJournalEntry,
    deleteJournalEntry,
    deleteAccount,
    autoGenerateJournalsFromOperations,
    brandConfig,
    language,
    canAccessFinancials,
  } = useApp();

  const isAr = language === 'ar';

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<AccountingTab>('coa');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalParentId, setAccountModalParentId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);

  // Tree expanded nodes state in CoA
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    // Expand root items by default
    const init: Record<string, boolean> = {};
    accounts.forEach((a) => {
      if (!a.parentId) init[a.id] = true;
    });
    return init;
  });

  // Filters
  const [coaSearch, setCoaSearch] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState<string>('ALL');

  const [journalSearch, setJournalSearch] = useState('');
  const [journalStatusFilter, setJournalStatusFilter] = useState<string>('ALL');
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);

  // General Ledger drilldown state
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>(() => accounts[0]?.id || '');

  // Notifications / Auto-sync feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle tree node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const expandAllNodes = () => {
    const all: Record<string, boolean> = {};
    accounts.forEach((a) => {
      all[a.id] = true;
    });
    setExpandedNodes(all);
  };

  const collapseAllNodes = () => {
    setExpandedNodes({});
  };

  // Pre-calculate financial statements
  const trialBalance = useMemo(() => getTrialBalance(), [accounts, journalEntries]);
  const incomeStatement = useMemo(() => getIncomeStatement(), [accounts, journalEntries]);
  const balanceSheet = useMemo(() => getBalanceSheet(), [accounts, journalEntries]);

  // General ledger statement for selected account
  const ledgerStatement = useMemo(() => {
    if (!selectedLedgerAccountId) return null;
    return getAccountLedger(selectedLedgerAccountId);
  }, [selectedLedgerAccountId, accounts, journalEntries]);

  // Account deletion handler with safeguards
  const handleDeleteAccount = (acc: Account) => {
    const hasChildren = accounts.some((a) => a.parentId === acc.id);
    if (hasChildren) {
      alert(isAr ? 'لا يمكن حذف هذا الحساب لأنه يحتوي على حسابات فرعية تحته!' : 'Cannot delete account with children!');
      return;
    }
    const hasEntries = journalEntries.some((j) => j.lines.some((l) => l.accountId === acc.id));
    if (hasEntries) {
      alert(isAr ? 'لا يمكن حذف هذا الحساب لوجود قيود يومية مسجلة عليه!' : 'Cannot delete account linked to journal entries!');
      return;
    }
    if (window.confirm(isAr ? `هل أنت متأكد من حذف الحساب [${acc.code}] ${acc.nameAr}؟` : `Delete account ${acc.code}?`)) {
      const res = deleteAccount(acc.id);
      if (res.success) {
        showToast(isAr ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
      } else {
        alert(res.message);
      }
    }
  };

  // Auto-generate journals trigger
  const handleAutoGenerateJournals = () => {
    if (
      window.confirm(
        isAr
          ? 'سيقوم النظام بقراءة جميع العمليات الميدانية وسندات القبض والصرف، وتوليد القيود المحاسبية المزدوجة آلياً وتحديث ميزان المراجعة. هل تود المتابعة؟'
          : 'Auto-generate double-entry journals from operations and vouchers?'
      )
    ) {
      const result = autoGenerateJournalsFromOperations();
      const count = result.generatedCount;
      showToast(
        isAr
          ? `تم توليد وترحيل (${count}) قيد محاسبي بنجاح من سجل العمليات والسندات`
          : `Generated ${count} journal entries from operations`
      );
    }
  };

  // Render CoA Recursive Tree Item
  const renderAccountNode = (account: Account, level: number = 0) => {
    const children = accounts
      .filter((a) => a.parentId === account.id)
      .sort((a, b) => a.code.localeCompare(b.code));
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[account.id];
    const calculatedBalance = getAccountCalculatedBalance(account.id);

    // Apply search filter
    if (coaSearch.trim()) {
      const matchSearch =
        account.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
        account.nameAr.toLowerCase().includes(coaSearch.toLowerCase()) ||
        account.nameEn.toLowerCase().includes(coaSearch.toLowerCase());
      const hasMatchingChild = children.some(
        (c) =>
          c.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
          c.nameAr.toLowerCase().includes(coaSearch.toLowerCase())
      );
      if (!matchSearch && !hasMatchingChild) return null;
    }

    // Apply type filter
    if (coaTypeFilter !== 'ALL' && account.type !== coaTypeFilter) {
      return null;
    }

    const typeBadgeStyles: Record<AccountType, string> = {
      Asset: 'bg-blue-50 text-blue-700 border-blue-200',
      Liability: 'bg-amber-50 text-amber-700 border-amber-200',
      Equity: 'bg-purple-50 text-purple-700 border-purple-200',
      Revenue: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Expense: 'bg-rose-50 text-rose-700 border-rose-200',
    };

    return (
      <div key={account.id} className="select-none">
        <div
          className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 ${
            level === 0
              ? 'bg-neutral-50/60 font-black text-neutral-900 mt-1'
              : level === 1
              ? 'bg-white font-bold text-neutral-800'
              : 'bg-white/40 font-medium text-neutral-700'
          }`}
          style={{ [isAr ? 'marginRight' : 'marginLeft']: `${level * 20}px` }}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(account.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 hover:bg-orange-100 hover:text-[#F05627] transition"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="h-6 w-6 shrink-0 flex items-center justify-center text-neutral-300">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              </span>
            )}

            {/* Account Code */}
            <span className="font-mono text-xs font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
              {account.code}
            </span>

            {/* Account Names */}
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs truncate font-bold text-neutral-900">{account.nameAr}</span>
              {account.nameEn && (
                <span className="hidden sm:inline text-[11px] text-neutral-400 font-normal">
                  ({account.nameEn})
                </span>
              )}
            </div>

            {/* Type badge for root or high level */}
            <span
              className={`hidden md:inline-block rounded-md border px-2 py-0.5 text-[10px] font-black ${
                typeBadgeStyles[account.type]
              }`}
            >
              {account.type}
            </span>
          </div>

          {/* Balance & Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-left font-mono">
              <span
                className={`text-xs font-black ${
                  calculatedBalance < 0
                    ? 'text-rose-600'
                    : calculatedBalance > 0
                    ? 'text-neutral-900'
                    : 'text-neutral-400'
                }`}
              >
                {calculatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-[10px] font-bold text-neutral-400">ر.س</span>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => {
                  setSelectedLedgerAccountId(account.id);
                  setActiveTab('ledger');
                }}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 transition"
                title={isAr ? 'عرض كشف الأستاذ العام لهذا الحساب' : 'View Account Ledger'}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountModalParentId(account.id);
                  setEditingAccount(null);
                  setIsAccountModalOpen(true);
                }}
                className="rounded-lg p-1.5 text-[#F05627] hover:bg-orange-50 transition"
                title={isAr ? 'إضافة حساب فرعي تابع' : 'Add Child Account'}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingAccount(account);
                  setAccountModalParentId(account.parentId || null);
                  setIsAccountModalOpen(true);
                }}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 transition"
                title={isAr ? 'تعديل الحساب' : 'Edit Account'}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>

              {!hasChildren && (
                <button
                  type="button"
                  onClick={() => handleDeleteAccount(account)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title={isAr ? 'حذف الحساب' : 'Delete Account'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Render child accounts if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map((child) => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="accounting-financials-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-[#F05627] text-white shadow-md shadow-orange-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 tracking-tight">
                {isAr ? 'المحاسبة العامة والقوائم المالية' : 'General Ledger & Financial Statements'}
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                {isAr
                  ? 'نظام القيد المزدوج، شجرة الحسابات المتكاملة، ميزان المراجعة، وقوائم الدخل والمركز المالي'
                  : 'Double-Entry Accounting, Chart of Accounts, Trial Balance & Financial Reports'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAutoGenerateJournals}
            className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-2 text-xs font-bold text-[#F05627] hover:bg-orange-100 transition shadow-xs"
            title={isAr ? 'توليد قيود محاسبية لجميع العمليات الميدانية تلقائياً' : 'Auto-generate journals from operations'}
          >
            <Sparkles className="h-4 w-4 text-[#F05627]" />
            <span>{isAr ? 'التوليد الآلي للقيود' : 'Auto-Journalize'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setAccountModalParentId(null);
              setIsAccountModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition shadow-xs"
          >
            <Plus className="h-4 w-4 text-neutral-600" />
            <span>{isAr ? 'حساب جديد' : 'New Account'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingJournalEntry(null);
              setIsJournalModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:from-orange-500 hover:to-orange-600 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'قيد يومية جديد' : 'New Journal Entry'}</span>
          </button>
        </div>
      </div>

      {/* Financial Pulse KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Assets */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            {isAr ? 'إجمالي الأصول' : 'Total Assets'}
          </span>
          <p className="mt-2 text-base font-black text-blue-950 font-mono">
            {balanceSheet.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-blue-600/80">ر.س (SAR)</span>
        </div>

        {/* Total Liabilities */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
            <Scale className="h-3.5 w-3.5 text-amber-600" />
            {isAr ? 'إجمالي الخصوم' : 'Total Liabilities'}
          </span>
          <p className="mt-2 text-base font-black text-amber-950 font-mono">
            {balanceSheet.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-amber-600/80">ر.س (SAR)</span>
        </div>

        {/* Total Equity */}
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-purple-600" />
            {isAr ? 'حقوق الملكية' : 'Total Equity'}
          </span>
          <p className="mt-2 text-base font-black text-purple-950 font-mono">
            {balanceSheet.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-purple-600/80">ر.س (SAR)</span>
        </div>

        {/* Total Revenues */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            {isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}
          </span>
          <p className="mt-2 text-base font-black text-emerald-950 font-mono">
            {incomeStatement.totalRevenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-emerald-600/80">ر.س (SAR)</span>
        </div>

        {/* Direct Costs & Expenses */}
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            {isAr ? 'المصروفات والتكاليف' : 'Expenses & COGS'}
          </span>
          <p className="mt-2 text-base font-black text-rose-950 font-mono">
            {(incomeStatement.totalCostOfSales + incomeStatement.totalOperatingExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-rose-600/80">ر.س (SAR)</span>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-[#F05627] flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-[#F05627]" />
            {isAr ? 'صافي الربح الدوري' : 'Net Income'}
          </span>
          <p className={`mt-2 text-base font-black font-mono ${incomeStatement.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {incomeStatement.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-bold text-[#F05627]">
            {isAr ? 'هامش الربح:' : 'Margin:'} {incomeStatement.netProfitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200">
        {[
          { id: 'coa' as AccountingTab, labelAr: 'شجرة ودليل الحسابات', labelEn: 'Chart of Accounts', icon: Layers },
          { id: 'journal' as AccountingTab, labelAr: 'دفتر اليومية العامة والقيود', labelEn: 'General Journal Entries', icon: FileText, count: journalEntries.length },
          { id: 'trial-balance' as AccountingTab, labelAr: 'ميزان المراجعة', labelEn: 'Trial Balance', icon: Scale },
          { id: 'income-statement' as AccountingTab, labelAr: 'قائمة الدخل (الأرباح والخسائر)', labelEn: 'Income Statement (P&L)', icon: TrendingUp },
          { id: 'balance-sheet' as AccountingTab, labelAr: 'الميزانية العمومية (المركز المالي)', labelEn: 'Balance Sheet', icon: Landmark },
          { id: 'ledger' as AccountingTab, labelAr: 'كشف الأستاذ العام', labelEn: 'General Ledger', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200/80'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#F05627]' : 'text-neutral-500'}`} />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              {tab.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive ? 'bg-[#F05627] text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. CHART OF ACCOUNTS (CoA) TAB */}
      {/* ========================================================================= */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  placeholder={isAr ? 'بحث برقم أو اسم الحساب...' : 'Search by code or name...'}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/60 py-2 pr-9 pl-3 text-xs font-bold text-neutral-900 focus:border-[#F05627] focus:bg-white outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={coaTypeFilter}
                onChange={(e) => setCoaTypeFilter(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2 text-xs font-bold text-neutral-800 focus:border-[#F05627] focus:bg-white outline-none"
              >
                <option value="ALL">{isAr ? 'جميع أنواع الحسابات' : 'All Account Types'}</option>
                <option value="Asset">{isAr ? '1000 - الأصول (Assets)' : 'Assets (1000)'}</option>
                <option value="Liability">{isAr ? '2000 - الخصوم (Liabilities)' : 'Liabilities (2000)'}</option>
                <option value="Equity">{isAr ? '3000 - حقوق الملكية (Equity)' : 'Equity (3000)'}</option>
                <option value="Revenue">{isAr ? '4000 - الإيرادات (Revenue)' : 'Revenue (4000)'}</option>
                <option value="Expense">{isAr ? '5000/6000 - المصروفات والتكاليف (Expenses)' : 'Expenses (5000/6000)'}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllNodes}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                {isAr ? 'توسيع الكل' : 'Expand All'}
              </button>
              <button
                type="button"
                onClick={collapseAllNodes}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                {isAr ? 'طي الكل' : 'Collapse All'}
              </button>
            </div>
          </div>

          {/* Tree View Container */}
          <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 px-3 text-xs font-black text-neutral-500 uppercase tracking-wider">
              <span>{isAr ? 'رمز واسم الحساب المحاسبي' : 'Account Code & Title'}</span>
              <span>{isAr ? 'الرصيد المحسوب الحالي' : 'Calculated Balance'}</span>
            </div>

            <div className="pt-2 space-y-1">
              {accounts
                .filter((a) => !a.parentId)
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((rootAccount) => renderAccountNode(rootAccount, 0))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GENERAL JOURNAL ENTRIES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  placeholder={isAr ? 'بحث بالمرجع أو شرح القيد...' : 'Search by reference or description...'}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/60 py-2 pr-9 pl-3 text-xs font-bold text-neutral-900 focus:border-[#F05627] focus:bg-white outline-none"
                />
              </div>

              <select
                value={journalStatusFilter}
                onChange={(e) => setJournalStatusFilter(e.target.value)}
                className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2 text-xs font-bold text-neutral-800 focus:border-[#F05627] focus:bg-white outline-none"
              >
                <option value="ALL">{isAr ? 'جميع الحالات (مرحل / مسودة)' : 'All Statuses'}</option>
                <option value="Posted">{isAr ? 'مُرحل فقط (Posted)' : 'Posted Only'}</option>
                <option value="Draft">{isAr ? 'مسودات فقط (Draft)' : 'Drafts Only'}</option>
              </select>
            </div>

            <div className="text-xs font-bold text-neutral-500">
              {isAr ? `إجمالي القيود: ${journalEntries.length}` : `Total entries: ${journalEntries.length}`}
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-3">
            {journalEntries
              .filter((j) => {
                if (journalStatusFilter !== 'ALL' && j.status !== journalStatusFilter) return false;
                if (journalSearch.trim()) {
                  const s = journalSearch.toLowerCase();
                  return (
                    j.id.toLowerCase().includes(s) ||
                    (j.referenceId && j.referenceId.toLowerCase().includes(s)) ||
                    j.description.toLowerCase().includes(s) ||
                    j.lines.some((l) => l.accountNameAr?.toLowerCase().includes(s) || l.accountCode?.toLowerCase().includes(s))
                  );
                }
                return true;
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry) => {
                const isExpanded = expandedJournalId === entry.id;
                const totalDeb = entry.totalDebit || entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
                const totalCred = entry.totalCredit || entry.lines.reduce((s, l) => s + (l.credit || 0), 0);

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition"
                  >
                    {/* Header */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-neutral-50/40">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F05627] font-mono font-black text-xs border border-orange-200">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-neutral-900">{entry.id}</span>
                            {entry.referenceId && (
                              <span className="rounded-md bg-neutral-200/70 px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-700">
                                {entry.referenceId}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                entry.status === 'Posted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {entry.status === 'Posted' ? (isAr ? 'مُرحل ومعتمد' : 'Posted') : (isAr ? 'مسودة' : 'Draft')}
                            </span>
                            <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {entry.date}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-neutral-900">{entry.description}</p>
                        </div>
                      </div>

                      {/* Right side: Amount & Controls */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        <div className="text-left font-mono">
                          <span className="block text-xs font-black text-neutral-900">
                            {totalDeb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            <span className="text-[10px] font-bold text-neutral-500">ر.س</span>
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-bold">
                            {isAr ? 'متزن (Debit = Credit)' : 'Balanced'}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {entry.status === 'Draft' ? (
                            <button
                              type="button"
                              onClick={() => postJournalEntry(entry.id)}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              {isAr ? 'ترحيل واعتماد' : 'Post'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => cancelOrDraftJournalEntry(entry.id)}
                              className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
                              title={isAr ? 'إلغاء الترحيل وإعادة لمسودة' : 'Revert to Draft'}
                            >
                              {isAr ? 'إلغاء الترحيل' : 'Revert'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingJournalEntry(entry);
                              setIsJournalModalOpen(true);
                            }}
                            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 transition"
                            title={isAr ? 'تعديل القيد' : 'Edit Entry'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا القيد؟' : 'Delete this entry?')) {
                                deleteJournalEntry(entry.id);
                              }
                            }}
                            className="rounded-xl p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title={isAr ? 'حذف القيد' : 'Delete Entry'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedJournalId(isExpanded ? null : entry.id)}
                            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 transition"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Journal Lines Table */}
                    {isExpanded && (
                      <div className="border-t border-neutral-200 bg-white p-4 animate-in fade-in duration-150">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-neutral-50 text-neutral-700 font-bold border-b border-neutral-200">
                              <tr>
                                <th className="p-2.5 w-8 text-center">#</th>
                                <th className="p-2.5 w-24">{isAr ? 'رقم الحساب' : 'Code'}</th>
                                <th className="p-2.5">{isAr ? 'اسم الحساب المحاسبي' : 'Account Title'}</th>
                                <th className="p-2.5 w-32 text-center">{isAr ? 'مدين (Debit)' : 'Debit'}</th>
                                <th className="p-2.5 w-32 text-center">{isAr ? 'دائن (Credit)' : 'Credit'}</th>
                                <th className="p-2.5">{isAr ? 'البيان / مركز التكلفة' : 'Notes'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {entry.lines.map((line, lIdx) => (
                                <tr key={lIdx} className="hover:bg-neutral-50/60">
                                  <td className="p-2.5 text-center font-bold text-neutral-400">{lIdx + 1}</td>
                                  <td className="p-2.5 font-mono font-bold text-neutral-900">{line.accountCode}</td>
                                  <td className="p-2.5 font-bold text-neutral-900">
                                    {line.accountNameAr || line.accountNameEn}
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-blue-700">
                                    {line.debit > 0
                                      ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      : '-'}
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                                    {line.credit > 0
                                      ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      : '-'}
                                  </td>
                                  <td className="p-2.5 text-neutral-600 text-[11px] font-medium">
                                    {line.notes || line.costCenter || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-neutral-50 font-black border-t border-neutral-200">
                              <tr>
                                <td colSpan={3} className="p-2.5 text-left">
                                  {isAr ? 'المجموع' : 'Total'}
                                </td>
                                <td className="p-2.5 text-center text-blue-700 font-mono">
                                  {totalDeb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                                </td>
                                <td className="p-2.5 text-center text-emerald-700 font-mono">
                                  {totalCred.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Audit Details */}
                        <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-400 font-bold border-t border-neutral-100 pt-2">
                          <span>
                            {isAr ? 'تم الإنشاء بواسطة:' : 'Created by:'} {entry.createdBy || 'النظام'} ({entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''})
                          </span>
                          {entry.postedBy && (
                            <span className="text-emerald-700">
                              {isAr ? 'معتمد ومرحل من:' : 'Posted by:'} {entry.postedBy} ({entry.postedAt ? new Date(entry.postedAt).toLocaleDateString() : ''})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TRIAL BALANCE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs">
            <div>
              <h2 className="text-base font-black text-neutral-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#F05627]" />
                {isAr ? 'ميزان المراجعة بالأرصدة والمجاميع' : 'Trial Balance Report'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {isAr ? 'تأكيد توازن الحسابات والترحيلات في دفتر الأستاذ العام' : 'Verification of General Ledger Double-Entry Equality'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {isAr ? 'الميزان متزن بنسبة 100%' : 'Balanced 100%'}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                <Printer className="h-4 w-4" />
                <span>{isAr ? 'طباعة الميزان' : 'Print'}</span>
              </button>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="rounded-3xl bg-white border border-neutral-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-neutral-900 text-white font-bold">
                  <tr>
                    <th className="p-3.5 w-24 font-mono">{isAr ? 'رمز الحساب' : 'Code'}</th>
                    <th className="p-3.5">{isAr ? 'اسم الحساب المحاسبي' : 'Account Title'}</th>
                    <th className="p-3.5 w-24 text-center">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="p-3.5 w-36 text-center text-blue-300 font-mono">{isAr ? 'إجمالي المدين (Debit)' : 'Total Debit'}</th>
                    <th className="p-3.5 w-36 text-center text-emerald-300 font-mono">{isAr ? 'إجمالي الدائن (Credit)' : 'Total Credit'}</th>
                    <th className="p-3.5 w-36 text-center font-mono">{isAr ? 'رصيد المدين النهائي' : 'Ending Debit'}</th>
                    <th className="p-3.5 w-36 text-center font-mono">{isAr ? 'رصيد الدائن النهائي' : 'Ending Credit'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(trialBalance?.rows || []).map((row) => (
                    <tr
                      key={row.account.id}
                      onClick={() => {
                        setSelectedLedgerAccountId(row.account.id);
                        setActiveTab('ledger');
                      }}
                      className="hover:bg-orange-50/40 cursor-pointer transition"
                    >
                      <td className="p-3 font-mono font-black text-neutral-900">{row.account.code}</td>
                      <td className="p-3 font-bold text-neutral-900">
                        {row.account.nameAr}
                        <span className="text-[11px] text-neutral-400 font-normal mr-2">
                          ({row.account.nameEn})
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                          {row.account.type}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-blue-900 font-bold">
                        {(row.totalDebit || 0) > 0 ? (row.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-900 font-bold">
                        {(row.totalCredit || 0) > 0 ? (row.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/30">
                        {(row.endingDebit || 0) > 0 ? (row.endingDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/30">
                        {(row.endingCredit || 0) > 0 ? (row.endingCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-100 font-black text-xs border-t-2 border-neutral-300">
                  <tr>
                    <td colSpan={3} className="p-4 text-left font-black text-sm">
                      {isAr ? 'الإجمالي العام لميزان المراجعة' : 'Grand Total'}
                    </td>
                    <td className="p-4 text-center font-mono text-blue-700 text-sm">
                      {(trialBalance?.totalDebitSum ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-4 text-center font-mono text-emerald-700 text-sm">
                      {(trialBalance?.totalCreditSum ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-4 text-center font-mono text-blue-900 text-sm bg-blue-100/60">
                      {(trialBalance?.totalEndingDebitSum ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-4 text-center font-mono text-emerald-900 text-sm bg-emerald-100/60">
                      {(trialBalance?.totalEndingCreditSum ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INCOME STATEMENT (P&L) TAB */}
      {/* ========================================================================= */}
      {activeTab === 'income-statement' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Header */}
          <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black text-[#F05627] tracking-wider uppercase">
                {brandConfig.companyNameAr}
              </span>
              <h2 className="text-lg font-black text-neutral-900 mt-1">
                {isAr ? 'قائمة الدخل والأرباح والخسائر' : 'Statement of Profit and Loss (Income Statement)'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {isAr ? 'للفترة المالية الحالية (وفق المعايير المحاسبية المعتمدة)' : 'For the current operational period'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
            >
              <Printer className="h-4 w-4" />
              <span>{isAr ? 'طباعة قائمة الدخل' : 'Print Statement'}</span>
            </button>
          </div>

          {/* Statement Document Card */}
          <div className="rounded-3xl bg-white p-8 border border-neutral-200/80 shadow-md space-y-6">
            {/* 1. Revenues Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-2">
                <span className="text-sm font-black text-neutral-900">
                  {isAr ? '1. الإيرادات التشغيلية (Operating Revenues)' : '1. Operating Revenues'}
                </span>
                <span className="text-xs font-bold text-neutral-400">{isAr ? 'المبلغ (SAR)' : 'Amount (SAR)'}</span>
              </div>

              <div className="space-y-2">
                {(incomeStatement?.revenues || []).map((item) => (
                  <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                    <span className="font-bold text-neutral-800">
                      [{item.account.code}] {item.account.nameAr}
                    </span>
                    <span className="font-mono font-bold text-neutral-900">
                      {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl font-black text-xs text-emerald-950 border border-emerald-100">
                <span>{isAr ? 'إجمالي الإيرادات التشغيلية' : 'Total Operating Revenues'}</span>
                <span className="font-mono text-sm">
                  {(incomeStatement?.totalRevenues ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>

            {/* 2. Direct Costs (Cost of Sales) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="text-sm font-black text-neutral-900">
                  {isAr ? '2. تكلفة المبيعات والتشغيل المباشر (Cost of Goods Sold)' : '2. Cost of Sales'}
                </span>
              </div>

              <div className="space-y-2">
                {(incomeStatement?.costOfSales || []).map((item) => (
                  <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                    <span className="font-bold text-neutral-800">
                      [{item.account.code}] {item.account.nameAr}
                    </span>
                    <span className="font-mono font-bold text-rose-700">
                      ({(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-rose-50/70 p-3 rounded-xl font-black text-xs text-rose-950 border border-rose-100">
                <span>{isAr ? 'إجمالي تكلفة المبيعات المباشرة' : 'Total Cost of Sales'}</span>
                <span className="font-mono text-sm">
                  ({(incomeStatement?.totalCostOfSales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ر.س
                </span>
              </div>
            </div>

            {/* Gross Profit Divider */}
            <div className="flex items-center justify-between bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-4 rounded-2xl font-black text-sm">
              <div>
                <span>{isAr ? 'إجمالي الربح التشغيلي (مجمل الربح)' : 'Gross Profit'}</span>
                <span className="block text-[11px] text-neutral-300 font-normal">
                  {isAr ? `هامش مجمل الربح: ${(incomeStatement?.grossProfitMargin ?? 0).toFixed(1)}%` : `Gross Margin: ${(incomeStatement?.grossProfitMargin ?? 0).toFixed(1)}%`}
                </span>
              </div>
              <span className="font-mono text-base text-emerald-400">
                {(incomeStatement?.grossProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
              </span>
            </div>

            {/* 3. Operating Expenses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="text-sm font-black text-neutral-900">
                  {isAr ? '3. المصروفات العمومية والإدارية (G&A Expenses)' : '3. Operating & Admin Expenses'}
                </span>
              </div>

              <div className="space-y-2">
                {(incomeStatement?.operatingExpenses || []).map((item) => (
                  <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                    <span className="font-bold text-neutral-800">
                      [{item.account.code}] {item.account.nameAr}
                    </span>
                    <span className="font-mono font-bold text-neutral-700">
                      ({(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-neutral-100 p-3 rounded-xl font-black text-xs text-neutral-900">
                <span>{isAr ? 'إجمالي المصروفات العمومية والإدارية' : 'Total G&A Expenses'}</span>
                <span className="font-mono text-sm">
                  ({(incomeStatement?.totalOperatingExpenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ر.س
                </span>
              </div>
            </div>

            {/* Net Operating Income Bottom Line */}
            <div className="rounded-3xl border-2 border-orange-500 bg-gradient-to-r from-orange-500 to-[#F05627] text-white p-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-base font-black">
                  {isAr ? 'صافي الدخل / الربح الدوري التشغيلي (Net Income)' : 'Net Operating Income'}
                </span>
                <p className="text-xs text-orange-100 font-semibold mt-0.5">
                  {isAr ? `نسبة صافي الربح من المبيعات: ${(incomeStatement?.netProfitMargin ?? 0).toFixed(1)}%` : `Net Margin: ${(incomeStatement?.netProfitMargin ?? 0).toFixed(1)}%`}
                </p>
              </div>
              <span className="font-mono text-xl font-black">
                {(incomeStatement?.netProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BALANCE SHEET (FINANCIAL POSITION) TAB */}
      {/* ========================================================================= */}
      {activeTab === 'balance-sheet' && (
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Header */}
          <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black text-[#F05627] tracking-wider uppercase">
                {brandConfig.companyNameAr}
              </span>
              <h2 className="text-lg font-black text-neutral-900 mt-1">
                {isAr ? 'الميزانية العمومية - قائمة المركز المالي' : 'Statement of Financial Position (Balance Sheet)'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {isAr ? `كما في تاريخ اليوم ${new Date().toLocaleDateString()} (المعادلة المحاسبية متزنة)` : 'As of today'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                balanceSheet?.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {balanceSheet?.isBalanced ? (isAr ? 'متزنة تماماً (Assets = L + E)' : 'Balanced') : (isAr ? 'فارق توازن' : 'Variance')}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                <Printer className="h-4 w-4" />
                <span>{isAr ? 'طباعة الميزانية' : 'Print'}</span>
              </button>
            </div>
          </div>

          {/* Dual Column Layout (Assets vs Liabilities & Equity) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left/Right Column: ASSETS */}
            <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-md space-y-4">
              <div className="border-b-2 border-blue-600 pb-2 flex items-center justify-between">
                <span className="text-sm font-black text-blue-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {isAr ? 'الأصول والموجودات (Assets)' : 'Assets'}
                </span>
                <span className="text-xs font-bold text-neutral-400">SAR</span>
              </div>

              {/* Current Assets */}
              <div className="space-y-2">
                <span className="text-xs font-black text-neutral-600 block">
                  {isAr ? 'الأصول المتداولة (Current Assets):' : 'Current Assets:'}
                </span>
                <div className="space-y-1 pl-2">
                  {(balanceSheet?.currentAssets || []).map((item) => (
                    <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                      <span className="font-bold text-neutral-800">
                        [{item.account.code}] {item.account.nameAr}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">
                        {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-Current Assets */}
              {((balanceSheet?.nonCurrentAssets || []).length > 0) && (
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <span className="text-xs font-black text-neutral-600 block">
                    {isAr ? 'الأصول غير المتداولة والثابتة (Non-Current Assets):' : 'Non-Current Assets:'}
                  </span>
                  <div className="space-y-1 pl-2">
                    {(balanceSheet?.nonCurrentAssets || []).map((item) => (
                      <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                        <span className="font-bold text-neutral-800">
                          [{item.account.code}] {item.account.nameAr}
                        </span>
                        <span className="font-mono font-bold text-neutral-900">
                          {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Assets Footer */}
              <div className="flex items-center justify-between bg-blue-900 text-white p-4 rounded-2xl font-black text-sm mt-6">
                <span>{isAr ? 'إجمالي الأصول والموجودات' : 'Total Assets'}</span>
                <span className="font-mono text-base text-blue-200">
                  {(balanceSheet?.totalAssets ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>

            {/* Right/Left Column: LIABILITIES & EQUITY */}
            <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-md space-y-4">
              {/* Liabilities Header */}
              <div className="border-b-2 border-amber-600 pb-2 flex items-center justify-between">
                <span className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-amber-600" />
                  {isAr ? 'الخصوم وحقوق الملكية (Liabilities & Equity)' : 'Liabilities & Equity'}
                </span>
                <span className="text-xs font-bold text-neutral-400">SAR</span>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-2">
                <span className="text-xs font-black text-neutral-600 block">
                  {isAr ? 'الخصوم والالتزامات المتداولة (Current Liabilities):' : 'Current Liabilities:'}
                </span>
                <div className="space-y-1 pl-2">
                  {(balanceSheet?.currentLiabilities || []).map((item) => (
                    <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                      <span className="font-bold text-neutral-800">
                        [{item.account.code}] {item.account.nameAr}
                      </span>
                      <span className="font-mono font-bold text-amber-900">
                        {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equity Section */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <span className="text-xs font-black text-neutral-600 block">
                  {isAr ? 'حقوق الملكية ورأس المال (Equity):' : 'Equity:'}
                </span>
                <div className="space-y-1 pl-2">
                  {(balanceSheet?.equityItems || []).map((item) => (
                    <div key={item.account.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-neutral-50 rounded-lg">
                      <span className="font-bold text-neutral-800">
                        [{item.account.code}] {item.account.nameAr}
                      </span>
                      <span className="font-mono font-bold text-purple-900">
                        {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}

                  {/* Retained / Current Period Profit */}
                  <div className="flex items-center justify-between text-xs py-1 px-2 bg-emerald-50/60 rounded-lg">
                    <span className="font-bold text-emerald-950">
                      {isAr ? 'أرباح الفترة الحالية (من قائمة الدخل)' : 'Current Period Net Income'}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {(balanceSheet?.retainedEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity Footer */}
              <div className="flex items-center justify-between bg-neutral-900 text-white p-4 rounded-2xl font-black text-sm mt-6">
                <span>{isAr ? 'إجمالي الخصوم وحقوق الملكية' : 'Total Liabilities & Equity'}</span>
                <span className="font-mono text-base text-emerald-400">
                  {(((balanceSheet?.totalLiabilities ?? 0) + (balanceSheet?.totalEquity ?? 0) + (balanceSheet?.retainedEarnings ?? 0)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. GENERAL LEDGER DRILLDOWN TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Account Selector Card */}
          <div className="rounded-3xl bg-white p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-xl">
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                {isAr ? 'اختر الحساب المحاسبي لعرض كشف الأستاذ العام:' : 'Select Account for Ledger Statement:'}
              </label>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-900 focus:border-[#F05627] focus:bg-white outline-none"
              >
                {accounts
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.nameAr} - ({acc.type})
                    </option>
                  ))}
              </select>
            </div>

            {ledgerStatement && (
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-left font-mono">
                  <span className="text-[11px] font-bold text-neutral-500 block">
                    {isAr ? 'الرصيد الختامي الحالي' : 'Closing Balance'}
                  </span>
                  <span className="text-lg font-black text-neutral-900">
                    {(ledgerStatement.endingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-bold text-neutral-400">ر.س</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>{isAr ? 'طباعة كشف الحساب' : 'Print'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          {ledgerStatement ? (
            <div className="rounded-3xl bg-white border border-neutral-200/80 overflow-hidden shadow-xs">
              <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-neutral-900 bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                    {ledgerStatement.account?.code || '-'}
                  </span>
                  <h3 className="text-sm font-black text-neutral-900">
                    {ledgerStatement.account?.nameAr || ''} ({ledgerStatement.account?.nameEn || ''})
                  </h3>
                  <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                    {ledgerStatement.account?.type || ''}
                  </span>
                </div>

                <span className="text-xs text-neutral-500 font-bold">
                  {isAr ? `عدد الحركات: ${(ledgerStatement.entries || []).length}` : `Transactions: ${(ledgerStatement.entries || []).length}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-neutral-900 text-white font-bold">
                    <tr>
                      <th className="p-3 w-28">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 w-28 font-mono">{isAr ? 'رقم القيد' : 'Entry #'}</th>
                      <th className="p-3 w-32">{isAr ? 'المرجع' : 'Reference'}</th>
                      <th className="p-3">{isAr ? 'البيان / تفاصيل العملية' : 'Description'}</th>
                      <th className="p-3 w-32 text-center text-blue-300 font-mono">{isAr ? 'مدين (Debit)' : 'Debit'}</th>
                      <th className="p-3 w-32 text-center text-emerald-300 font-mono">{isAr ? 'دائن (Credit)' : 'Credit'}</th>
                      <th className="p-3 w-36 text-center font-mono">{isAr ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(!ledgerStatement.entries || ledgerStatement.entries.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-400 font-bold">
                          {isAr ? 'لا توجد حركات أو قيود مسجلة على هذا الحساب حتى الآن' : 'No entries found for this account'}
                        </td>
                      </tr>
                    ) : (
                      ledgerStatement.entries.map((item, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 transition">
                          <td className="p-3 font-semibold text-neutral-700">{item.date}</td>
                          <td className="p-3 font-mono font-bold text-neutral-900">{item.journalId}</td>
                          <td className="p-3 font-mono text-neutral-600">{item.referenceId || '-'}</td>
                          <td className="p-3 font-bold text-neutral-800">
                            {item.description}
                            {item.notes && (
                              <span className="block text-[11px] text-neutral-400 font-normal">
                                {item.notes}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-blue-700">
                            {(item.debit || 0) > 0
                              ? (item.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-700">
                            {(item.credit || 0) > 0
                              ? (item.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-neutral-900 bg-neutral-50/50">
                            {(item.runningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-neutral-100 font-black border-t-2 border-neutral-300">
                    <tr>
                      <td colSpan={4} className="p-3.5 text-left font-black">
                        {isAr ? 'إجمالي حركات الفترة والرصيد النهائي' : 'Period Totals & Closing Balance'}
                      </td>
                      <td className="p-3.5 text-center font-mono text-blue-700">
                        {(ledgerStatement.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="p-3.5 text-center font-mono text-emerald-700">
                        {(ledgerStatement.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="p-3.5 text-center font-mono text-base text-neutral-950 bg-neutral-200/60">
                        {(ledgerStatement.endingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-400 font-bold rounded-3xl bg-white border border-neutral-200">
              {isAr ? 'يرجى اختيار حساب من القائمة أعلاه' : 'Please select an account'}
            </div>
          )}
        </div>
      )}

      {/* Account Creation / Edit Modal */}
      <CreateAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialParentId={accountModalParentId}
        editingAccount={editingAccount}
      />

      {/* Journal Entry Modal */}
      <CreateJournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        editingEntry={editingJournalEntry}
      />
    </div>
  );
};
