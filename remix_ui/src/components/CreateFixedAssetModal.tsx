import React, { useState } from 'react';
import { FixedAsset } from '../types';
import { X, Building, ShieldCheck, DollarSign, Calendar, Truck } from 'lucide-react';

interface CreateFixedAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: any) => Promise<void>;
  costCenters: Array<{ id: string; code: string; nameAr: string }>;
  isAr: boolean;
}

export const CreateFixedAssetModal: React.FC<CreateFixedAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  costCenters,
  isAr,
}) => {
  const [assetCode, setAssetCode] = useState('');
  const [assetNameAr, setAssetNameAr] = useState('');
  const [assetNameEn, setAssetNameEn] = useState('');
  const [category, setCategory] = useState<FixedAsset['category']>('Heavy_Trucks');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  const [salvageValue, setSalvageValue] = useState<number | ''>(0);
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<number | ''>(60);
  const [costCenterId, setCostCenterId] = useState(costCenters[0]?.id || 'CC-OPS-01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNameAr || !purchaseCost || !usefulLifeMonths) {
      alert(isAr ? 'يرجى استكمال الحقول الإلزامية للأصل' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        asset_code: assetCode.trim() || `AST-${Date.now().toString().slice(-4)}`,
        asset_name_ar: assetNameAr.trim(),
        asset_name_en: assetNameEn.trim(),
        category,
        purchase_date: purchaseDate,
        purchase_cost: Number(purchaseCost),
        salvage_value: Number(salvageValue || 0),
        useful_life_months: Number(usefulLifeMonths),
        cost_center_id: costCenterId,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الأصل الثابت');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#F05627]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">
                {isAr ? 'تسجيل أصل رأسمالي ثابت جديد' : 'Register New Capital Fixed Asset'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr ? 'قيد الأصل وتحديد العمر الافتراضي ومجمع الإهلاك' : 'Asset capitalization and depreciation schedule'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'كود الأصل (Asset Code)' : 'Asset Code'}
              </label>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder="مثال: AST-TRK-05"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'فئة الأصل (Category)' : 'Category'} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold focus:border-[#F05627] focus:outline-none"
              >
                <option value="Heavy_Trucks">{isAr ? 'شاحنات نقل ثقيل وتريلات' : 'Heavy Trucks'}</option>
                <option value="Crushing_Machinery">{isAr ? 'كسارات ومعدات محاجر' : 'Crushing Machinery'}</option>
                <option value="Trailers">{isAr ? 'مقطورات وصناديق قلاب' : 'Trailers'}</option>
                <option value="Vehicles">{isAr ? 'سيارات إشراف وخدمة' : 'Service Vehicles'}</option>
                <option value="IT_Office">{isAr ? 'أجهزة تقنية وحاسوب' : 'IT & Equipment'}</option>
                <option value="Other">{isAr ? 'أصول أخرى' : 'Other Assets'}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'اسم الأصل بالعربية' : 'Asset Name (Arabic)'} *
              </label>
              <input
                type="text"
                required
                value={assetNameAr}
                onChange={(e) => setAssetNameAr(e.target.value)}
                placeholder="مثال: شاحنة مرسيدس أكتروس قلاب 2024"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'اسم الأصل بالإنجليزية (اختياري)' : 'Asset Name (English)'}
              </label>
              <input
                type="text"
                value={assetNameEn}
                onChange={(e) => setAssetNameEn(e.target.value)}
                placeholder="Mercedes Actros Tipper 2024"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'تاريخ الشراء والرسملة' : 'Purchase Date'} *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'تكلفة الشراء الأصلية (ر.س)' : 'Purchase Cost (SAR)'} *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="450000"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'القيمة التخريدية المتبقية (Salvage Value)' : 'Salvage Value (SAR)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="50000"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'العمر الافتراضي (بالأشهر)' : 'Useful Life (Months)'} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="60 (5 سنوات)"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-[#F05627] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'مركز التكلفة التابع له (Leaf Cost Center)' : 'Cost Center'} *
              </label>
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold focus:border-[#F05627] focus:outline-none"
              >
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.code || cc.id}>
                    {cc.code} - {cc.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-[#F05627] px-5 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:from-orange-500 hover:to-orange-600 transition disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ ورسملة الأصل' : 'Save Asset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
