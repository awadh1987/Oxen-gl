import React, { useState } from 'react';
import { X, Users, DollarSign, ShieldCheck, CreditCard, Building } from 'lucide-react';

interface CreateEmployeeContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: any) => Promise<void>;
  costCenters: Array<{ id: string; code: string; nameAr: string }>;
  isAr: boolean;
}

export const CreateEmployeeContractModal: React.FC<CreateEmployeeContractModalProps> = ({
  isOpen,
  onClose,
  onSave,
  costCenters,
  isAr,
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeNameAr, setEmployeeNameAr] = useState('');
  const [employeeNameEn, setEmployeeNameEn] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [jobTitle, setJobTitle] = useState('سائق شاحنة ثقيلة');
  const [department, setDepartment] = useState('العمليات والتشغيل');
  const [basicSalary, setBasicSalary] = useState<number | ''>(6000);
  const [housingAllowance, setHousingAllowance] = useState<number | ''>(1500);
  const [transportAllowance, setTransportAllowance] = useState<number | ''>(800);
  const [otherAllowances, setOtherAllowances] = useState<number | ''>(0);
  const [gosiDeduction, setGosiDeduction] = useState<number | ''>(580);
  const [bankIban, setBankIban] = useState('');
  const [costCenterId, setCostCenterId] = useState(costCenters[0]?.code || 'CC-OPS-01');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalEarnings =
    Number(basicSalary || 0) +
    Number(housingAllowance || 0) +
    Number(transportAllowance || 0) +
    Number(otherAllowances || 0);
  const calculatedNet = Math.max(0, totalEarnings - Number(gosiDeduction || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeNameAr || !basicSalary) {
      alert(isAr ? 'يرجى إدخال اسم الموظف والراتب الأساسي' : 'Please enter employee name and basic salary');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        employee_code: employeeCode.trim() || `EMP-${Date.now().toString().slice(-4)}`,
        employee_name_ar: employeeNameAr.trim(),
        employee_name_en: employeeNameEn.trim(),
        national_id: nationalId.trim(),
        job_title: jobTitle.trim(),
        department: department.trim(),
        basic_salary: Number(basicSalary),
        housing_allowance: Number(housingAllowance || 0),
        transport_allowance: Number(transportAllowance || 0),
        other_allowances: Number(otherAllowances || 0),
        gosi_deduction: Number(gosiDeduction || 0),
        net_salary: calculatedNet,
        bank_iban: bankIban.trim(),
        cost_center_id: costCenterId,
        hire_date: hireDate,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل حفظ عقد الموظف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">
                {isAr ? 'تسجيل عقد موظف جديد' : 'Register New Employee Contract'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr ? 'بيانات الراتب والبدلات واشتراك التأمينات وربط مركز التكلفة' : 'Salary structure, allowances & cost center'}
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
                {isAr ? 'الرقم الوظيفي (Employee Code)' : 'Employee Code'}
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="مثال: EMP-005"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'رقم الهوية / الإقامة' : 'National ID / Iqama'}
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="10 رقماً"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'اسم الموظف بالعربية' : 'Employee Name (Arabic)'} *
              </label>
              <input
                type="text"
                required
                value={employeeNameAr}
                onChange={(e) => setEmployeeNameAr(e.target.value)}
                placeholder="مثال: أحمد عبدالكريم الشمري"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'المسمى الوظيفي' : 'Job Title'} *
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="سائق تريلة ثقيلة"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'الراتب الأساسي (ر.س)' : 'Basic Salary (SAR)'} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'بدل السكن (ر.س)' : 'Housing Allowance'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={housingAllowance}
                onChange={(e) => setHousingAllowance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'بدل النقل (ر.س)' : 'Transport Allowance'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'خصم التأمينات (GOSI)' : 'GOSI Deduction'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={gosiDeduction}
                onChange={(e) => setGosiDeduction(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono font-bold text-rose-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'مركز التكلفة التابع له' : 'Cost Center'} *
              </label>
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:outline-none"
              >
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.code || cc.id}>
                    {cc.code} - {cc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {isAr ? 'رقم الآيبان البنكي (IBAN)' : 'Bank IBAN'}
              </label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="SA..."
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Net summary */}
          <div className="rounded-2xl bg-blue-50/70 p-3.5 border border-blue-100 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">
              {isAr ? 'صافي الراتب المستحق شهرياً:' : 'Calculated Monthly Net Salary:'}
            </span>
            <span className="text-sm font-black text-blue-950 font-mono">
              {calculatedNet.toLocaleString()} ر.س
            </span>
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
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'اعتماد وحفظ العقد' : 'Save Contract'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
