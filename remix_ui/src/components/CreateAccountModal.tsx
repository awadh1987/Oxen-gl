import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Account, AccountType } from '../types';
import { X, Plus, Building2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParentId?: string | null;
  editingAccount?: Account | null;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  initialParentId,
  editingAccount,
}) => {
  const { accounts, addAccount, updateAccount, language } = useApp();
  const isAr = language === 'ar';

  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<AccountType>('Asset');
  const [parentId, setParentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setCode(editingAccount.code);
      setNameAr(editingAccount.nameAr);
      setNameEn(editingAccount.nameEn);
      setType(editingAccount.type);
      setParentId(editingAccount.parentId || null);
      setDescription(editingAccount.description || '');
      setError(null);
    } else {
      setParentId(initialParentId || null);
      if (initialParentId) {
        const parent = accounts.find((a) => a.id === initialParentId);
        if (parent) {
          setType(parent.type);
          // Suggest next code
          const siblings = accounts.filter((a) => a.parentId === initialParentId);
          const nextNum = siblings.length + 1;
          const suggestedCode = `${parent.code}${String(nextNum).padStart(2, '0')}`;
          setCode(suggestedCode);
        }
      } else {
        setCode('');
        setType('Asset');
      }
      setNameAr('');
      setNameEn('');
      setDescription('');
      setError(null);
    }
  }, [editingAccount, initialParentId, accounts, isOpen]);

  // When parent changes in create mode, auto-align type
  const handleParentChange = (newParentId: string) => {
    const val = newParentId === '' ? null : newParentId;
    setParentId(val);
    if (val) {
      const parent = accounts.find((a) => a.id === val);
      if (parent) {
        setType(parent.type);
        const siblings = accounts.filter((a) => a.parentId === val);
        const nextNum = siblings.length + 1;
        setCode(`${parent.code}${String(nextNum).padStart(2, '0')}`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError(isAr ? 'يرجى إدخال رمز الحساب' : 'Please enter account code');
      return;
    }
    if (!nameAr.trim()) {
      setError(isAr ? 'يرجى إدخال اسم الحساب بالعربية' : 'Please enter Arabic account name');
      return;
    }

    if (editingAccount) {
      const res = updateAccount(editingAccount.id, {
        code: code.trim(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        type,
        parentId,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setError(res.message || (isAr ? 'حدث خطأ أثناء تعديل الحساب' : 'Error updating account'));
        return;
      }
    } else {
      const res = addAccount({
        code: code.trim(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        type,
        parentId,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setError(res.message || (isAr ? 'حدث خطأ أثناء إضافة الحساب' : 'Error creating account'));
        return;
      }
    }

    onClose();
  };

  const accountTypeLabels: Record<AccountType, { ar: string; en: string; class: string }> = {
    Asset: { ar: 'أصول (Assets)', en: 'Assets', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    Liability: { ar: 'خصوم / التزامات (Liabilities)', en: 'Liabilities', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    Equity: { ar: 'حقوق ملكية (Equity)', en: 'Equity', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    Revenue: { ar: 'إيرادات (Revenues)', en: 'Revenues', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Expense: { ar: 'مصروفات وتكاليف (Expenses)', en: 'Expenses', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-[#F05627] text-white shadow-md shadow-orange-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {editingAccount
                  ? isAr
                    ? 'تعديل الحساب المحاسبي'
                    : 'Edit Accounting Account'
                  : isAr
                  ? 'إضافة حساب جديد في الدليل المحاسبي'
                  : 'Add New Account to Chart of Accounts'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {isAr ? 'هيكل شجرة الحسابات والمعايير المحاسبية المعتمدة' : 'Standard Chart of Accounts Architecture'}
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account Code */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'رمز / رقم الحساب *' : 'Account Code *'}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 1104 أو 5103"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-900 focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'نوع الحساب / التصنيف *' : 'Account Type *'}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-bold text-neutral-900 bg-white focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
              >
                <option value="Asset">{isAr ? 'أصول (Assets - 1000)' : 'Assets (1000)'}</option>
                <option value="Liability">{isAr ? 'خصوم / التزامات (Liabilities - 2000)' : 'Liabilities (2000)'}</option>
                <option value="Equity">{isAr ? 'حقوق ملكية (Equity - 3000)' : 'Equity (3000)'}</option>
                <option value="Revenue">{isAr ? 'إيرادات مبيعات (Revenue - 4000)' : 'Revenue (4000)'}</option>
                <option value="Expense">{isAr ? 'مصروفات وتكاليف (Expenses - 5000/6000)' : 'Expenses (5000/6000)'}</option>
              </select>
            </div>
          </div>

          {/* Parent Account */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {isAr ? 'الحساب الرئيسي الأب (Parent Account)' : 'Parent Account'}
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => handleParentChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-800 bg-white focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
            >
              <option value="">{isAr ? '-- حساب رئيسي من المستوى الأول (لا يوجد أب) --' : '-- Top-Level Root Account --'}</option>
              {accounts
                .filter((a) => (!editingAccount || a.id !== editingAccount.id) && a.type === type)
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.nameAr} - ({acc.type})
                  </option>
                ))}
            </select>
          </div>

          {/* Arabic Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {isAr ? 'اسم الحساب بالعربية *' : 'Arabic Account Name *'}
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: حساب بنك الراجحي - الجاري"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
            />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {isAr ? 'اسم الحساب بالإنجليزية (اختياري)' : 'English Account Name'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Al Rajhi Bank Current Account"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {isAr ? 'الوصف / ملاحظات وتوجيه المحاسبة' : 'Description & Accounting Guidance'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ملاحظات توجيهية عن استخدام هذا الحساب..."
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-900 focus:border-[#F05627] focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-500 hover:to-orange-600 transition"
            >
              {editingAccount
                ? isAr
                  ? 'حفظ التعديلات'
                  : 'Save Changes'
                : isAr
                ? 'إضافة الحساب للدليل'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
