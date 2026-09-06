import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Account, JournalLine, JournalEntry } from '../types';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, FileText, Scale, Calculator, ArrowRightLeft } from 'lucide-react';
import { apiService } from '../services/api';

interface CreateJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntry?: JournalEntry | null;
}

export const CreateJournalEntryModal: React.FC<CreateJournalEntryModalProps> = ({
  isOpen,
  onClose,
  editingEntry,
}) => {
  const { accounts, addJournalEntry, updateJournalEntry, language } = useApp();
  const isAr = language === 'ar';

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceId, setReferenceId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Posted'>('Posted');
  const [lines, setLines] = useState<Array<{
    accountId: string;
    debit: string;
    credit: string;
    costCenter?: string;
    notes?: string;
  }>>([
    { accountId: '', debit: '', credit: '', costCenter: '', notes: '' },
    { accountId: '', debit: '', credit: '', costCenter: '', notes: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Filter leaf accounts for journal entries (only accounts with is_postable !== false and without sub-accounts can take direct entries)
  const leafAccounts = React.useMemo(() => {
    const parentIds = new Set(accounts.map((a) => a.parentId).filter(Boolean));
    return accounts
      .filter((a) => !parentIds.has(a.id) && a.is_postable !== false)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts]);

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date);
      setReferenceId(editingEntry.referenceId || '');
      setDescription(editingEntry.description);
      setStatus(editingEntry.status);
      setLines(
        editingEntry.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit > 0 ? String(l.debit) : '',
          credit: l.credit > 0 ? String(l.credit) : '',
          costCenter: l.costCenter || '',
          notes: l.notes || '',
        }))
      );
      setError(null);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setReferenceId(`REF-${Date.now().toString().slice(-6)}`);
      setDescription('');
      setStatus('Posted');
      setLines([
        { accountId: leafAccounts[0]?.id || '', debit: '', credit: '', costCenter: '', notes: '' },
        { accountId: leafAccounts[1]?.id || '', debit: '', credit: '', costCenter: '', notes: '' },
      ]);
      setError(null);
    }
  }, [editingEntry, leafAccounts, isOpen]);

  const handleAddLine = () => {
    setLines((prev) => [...prev, { accountId: leafAccounts[0]?.id || '', debit: '', credit: '', costCenter: '', notes: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      setError(isAr ? 'يجب أن يحتوي القيد على سطرين على الأقل (طرف مدين وطرف دائن)' : 'At least two lines required');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    index: number,
    field: 'accountId' | 'debit' | 'credit' | 'costCenter' | 'notes',
    value: string
  ) => {
    setError(null);
    setLines((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (field === 'debit') {
        target.debit = value;
        if (value && Number(value) > 0) {
          target.credit = ''; // Clear opposite side if debit is typed
        }
      } else if (field === 'credit') {
        target.credit = value;
        if (value && Number(value) > 0) {
          target.debit = ''; // Clear opposite side if credit is typed
        }
      } else {
        (target as any)[field] = value;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Calculate totals
  const totalDebit = Number(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0).toFixed(2));
  const totalCredit = Number(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0).toFixed(2));
  const variance = Number((totalDebit - totalCredit).toFixed(2));
  const isBalanced = totalDebit > 0 && Math.abs(variance) < 0.01;

  // Auto-balance helper
  const handleAutoBalance = () => {
    if (lines.length < 2) return;
    const lastIdx = lines.length - 1;
    const diff = Number((totalDebit - totalCredit).toFixed(2));

    if (diff > 0) {
      // Debit is higher, add to last line's credit
      handleLineChange(lastIdx, 'credit', String(Number(lines[lastIdx].credit || 0) + diff));
    } else if (diff < 0) {
      // Credit is higher, add to last line's debit
      handleLineChange(lastIdx, 'debit', String(Number(lines[lastIdx].debit || 0) + Math.abs(diff)));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError(isAr ? 'يرجى إدخال شرح / بيان القيد المحاسبي' : 'Please enter entry description');
      return;
    }

    if (!isBalanced) {
      setError(
        isAr
          ? `القيد غير متزن! إجمالي المدين (${totalDebit.toLocaleString()} ر.س) لا يساوي إجمالي الدائن (${totalCredit.toLocaleString()} ر.س). الفارق: ${Math.abs(variance).toFixed(2)} ر.س`
          : `Entry is not balanced! Difference is ${Math.abs(variance).toFixed(2)} SAR`
      );
      return;
    }

    // Validate that all lines have an account selected
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        setError(isAr ? `يرجى تحديد الحساب للسطر رقم (${i + 1})` : `Please select an account for line ${i + 1}`);
        return;
      }
      const acc = accounts.find((a) => a.id === line.accountId);
      if (acc && acc.is_postable === false) {
        setError(
          isAr
            ? `لا يمكن الترحيل على الحساب التجميعي (${acc.code} - ${acc.nameAr})! يرجى اختيار حساب فرعي قابل للترحيل.`
            : `Cannot post to parent summary account ${acc.code}! Please select a postable sub-account.`
        );
        return;
      }
      const deb = Number(line.debit || 0);
      const cred = Number(line.credit || 0);
      if (deb === 0 && cred === 0) {
        setError(isAr ? `يرجى إدخال مبلغ في المدين أو الدائن للسطر (${i + 1})` : `Line ${i + 1} has zero amount`);
        return;
      }
    }

    const payloadLines: JournalLine[] = lines.map((l) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      return {
        accountId: l.accountId,
        accountCode: acc?.code || '',
        accountNameAr: acc?.nameAr || '',
        accountNameEn: acc?.nameEn || '',
        debit: Number(Number(l.debit || 0).toFixed(2)),
        credit: Number(Number(l.credit || 0).toFixed(2)),
        costCenter: l.costCenter?.trim() || undefined,
        notes: l.notes?.trim() || undefined,
      };
    });

    if (editingEntry) {
      const res = await updateJournalEntry(editingEntry.id, {
        date,
        referenceId: referenceId.trim() || undefined,
        description: description.trim(),
        status,
        lines: payloadLines,
      });

      if (!res.success) {
        setError(res.message || (isAr ? 'فشل تحديث القيد' : 'Failed to update journal entry'));
        return;
      }
    } else {
      let persistedId: string;
      try {
        const persisted = await apiService.createJournalEntry({
          entry_number: `JE-${Date.now()}`,
          reference_type: 'Manual',
          reference_id: referenceId.trim() || undefined,
          description: description.trim(),
          status,
          lines: payloadLines.map((line) => ({
            account: line.accountNameEn || line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.notes,
          })),
        });
        persistedId = persisted.id;
      } catch (error) {
        setError(error instanceof Error ? error.message : (isAr ? 'تعذر حفظ القيد في الخادم' : 'Could not save journal entry on the server'));
        return;
      }

      const res = addJournalEntry({
        id: persistedId,
        date,
        referenceId: referenceId.trim() || undefined,
        description: description.trim(),
        status,
        lines: payloadLines,
        totalDebit,
        totalCredit,
      });

      if (!res.success) {
        setError(res.message || (isAr ? 'فشل تسجيل القيد' : 'Failed to create journal entry'));
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-[#F05627] text-white shadow-md shadow-orange-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {editingEntry
                  ? isAr
                    ? `تعديل القيد المحاسبي (${editingEntry.id})`
                    : `Edit Journal Entry (${editingEntry.id})`
                  : isAr
                  ? 'إنشاء قيد محاسبي مزدوج جديد (Journal Entry)'
                  : 'New Double-Entry Journal Voucher'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {isAr ? 'التسجيل في دفتر اليومية العامة وترحيل الأستاذ العام' : 'General Journal Ledger Posting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50/70 rounded-2xl p-4 border border-neutral-100">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'تاريخ القيد *' : 'Entry Date *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-900 bg-white focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'المرجع / رقم الفاتورة أو السند' : 'Reference / Doc Number'}
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="INV-1048 أو CRUSH-STMT أو تسوية"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 bg-white focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'حالة القيد *' : 'Posting Status *'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-900 bg-white focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
              >
                <option value="Posted">{isAr ? 'مُرحل ومعتمد (Posted)' : 'Posted & Approved'}</option>
                <option value="Draft">{isAr ? 'مسودة معلقة (Draft)' : 'Draft / Pending'}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {isAr ? 'بيان / شرح القيد المحاسبي (Narration) *' : 'Journal Narration / Description *'}
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: إثبات إيراد مبيعات توريد مواد حصوية لمشروع نيوم - بموجب فاتورة ضريبية INV-2026-08-1048"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
            />
          </div>

          {/* Journal Entry Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#F05627]" />
                {isAr ? 'أطراف القيد المحاسبي (أطراف الحسابات)' : 'Journal Lines (Debits & Credits)'}
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 text-xs font-bold text-[#F05627] hover:text-orange-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                {isAr ? 'إضافة طرف جديد' : 'Add Line'}
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-200">
              <table className="w-full text-xs text-right">
                <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3 w-64">{isAr ? 'الحساب المحاسبي' : 'Account'}</th>
                    <th className="p-3 w-32 text-center">{isAr ? 'مدين (SAR Debit)' : 'Debit (SAR)'}</th>
                    <th className="p-3 w-32 text-center">{isAr ? 'دائن (SAR Credit)' : 'Credit (SAR)'}</th>
                    <th className="p-3">{isAr ? 'مركز التكلفة / البيان الفرعي' : 'Cost Center / Notes'}</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/60 transition">
                      <td className="p-3 text-center font-bold text-neutral-400">{idx + 1}</td>
                      <td className="p-2">
                        <select
                          required
                          value={line.accountId}
                          onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 px-2.5 py-2 text-xs font-bold text-neutral-900 bg-white focus:border-[#F05627] focus:ring-1 focus:ring-orange-500 outline-none"
                        >
                          <option value="">{isAr ? '-- اختر الحساب --' : '-- Select Account --'}</option>
                          {leafAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              [{acc.code}] {acc.nameAr} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          placeholder="0.00"
                          className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold text-center outline-none transition ${
                            Number(line.debit) > 0
                              ? 'border-blue-300 bg-blue-50/50 text-blue-900 font-black'
                              : 'border-neutral-200 text-neutral-900 focus:border-[#F05627]'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          placeholder="0.00"
                          className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold text-center outline-none transition ${
                            Number(line.credit) > 0
                              ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-black'
                              : 'border-neutral-200 text-neutral-900 focus:border-[#F05627]'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.notes || ''}
                          onChange={(e) => handleLineChange(idx, 'notes', e.target.value)}
                          placeholder={isAr ? 'بيان تفصيلي للسطر أو مركز التكلفة...' : 'Line details...'}
                          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-800 focus:border-[#F05627] outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title={isAr ? 'حذف السطر' : 'Remove line'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50 font-black text-xs border-t-2 border-neutral-300">
                  <tr>
                    <td colSpan={2} className="p-3 text-left">
                      {isAr ? 'الإجمالي العام (المجموع)' : 'Total Sum'}
                    </td>
                    <td className="p-3 text-center text-blue-700 font-mono text-sm">
                      {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="p-3 text-center text-emerald-700 font-mono text-sm">
                      {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>
                    <td colSpan={2} className="p-3 text-center">
                      {isBalanced ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {isAr ? 'القيد متزن تماماً (Balanced)' : 'Perfect Balance'}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-black">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                            {isAr ? `غير متزن! الفارق: ${Math.abs(variance).toFixed(2)} ر.س` : `Unbalanced: ${Math.abs(variance).toFixed(2)} SAR`}
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoBalance}
                            className="px-2 py-1 rounded-lg bg-orange-100 text-[#F05627] hover:bg-orange-200 text-[11px] font-black transition flex items-center gap-1"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            {isAr ? 'موازنة آلياً' : 'Auto Balance'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">
              {isAr ? 'تأثير القيد:' : 'Posting Impact:'}
            </span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
              status === 'Posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {status === 'Posted' 
                ? (isAr ? 'ترحيل مباشر لميزان المراجعة والأستاذ العام' : 'Direct Posting to General Ledger')
                : (isAr ? 'حفظ كمسودة دون التأثير على الأرصدة' : 'Draft only')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isBalanced}
              className={`rounded-xl px-6 py-2.5 text-xs font-black text-white shadow-md transition flex items-center gap-1.5 ${
                isBalanced
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 shadow-orange-500/20 hover:from-orange-500 hover:to-orange-600'
                  : 'bg-neutral-300 cursor-not-allowed opacity-70'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingEntry
                ? isAr
                  ? 'تحديث وحفظ القيد'
                  : 'Save Journal Entry'
                : isAr
                ? 'تسجيل وترحيل القيد'
                : 'Post Journal Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
