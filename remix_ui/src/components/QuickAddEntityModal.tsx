import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Plus,
  Building2,
  Database,
  Truck,
  Package,
  CheckCircle,
} from 'lucide-react';

export type QuickAddEntityType = 'Customer' | 'Crusher' | 'Transporter' | 'Material';

interface QuickAddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: QuickAddEntityType;
  onSuccess: (createdName: string, createdId: string) => void;
}

export const QuickAddEntityModal: React.FC<QuickAddEntityModalProps> = ({
  isOpen,
  onClose,
  entityType,
  onSuccess,
}) => {
  const { addCustomer, addCrusher, addTransporter, addMaterial, language } = useApp();
  const isAr = language === 'ar';

  // Form states
  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerNameEn, setCustomerNameEn] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Crusher
  const [crusherName, setCrusherName] = useState('');
  const [crusherLocation, setCrusherLocation] = useState('');
  const [crusherBank, setCrusherBank] = useState('');
  const [crusherPhone, setCrusherPhone] = useState('');

  // Transporter
  const [transporterName, setTransporterName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [truckNo, setTruckNo] = useState('');
  const [transporterPhone, setTransporterPhone] = useState('');
  const [ratePerTon, setRatePerTon] = useState<number>(18);

  // Material
  const [materialNameAr, setMaterialNameAr] = useState('');
  const [materialNameEn, setMaterialNameEn] = useState('');
  const [materialCategory, setMaterialCategory] = useState<'Aggregate' | 'Sand' | 'Powder' | 'Subbase' | 'Water'>('Aggregate');
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(45);
  const [defaultPurchasePrice, setDefaultPurchasePrice] = useState<number>(26);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entityType === 'Customer') {
      if (!customerName.trim()) return;
      const created = addCustomer({
        customerName,
        customerNameEn: customerNameEn || customerName,
        taxNumber: taxNumber || '300000000000003',
        contactPerson: contactPerson || 'مسؤول المشتريات',
        phone: phone || '+966 50 000 0000',
        email: 'info@client.sa',
        address: address || 'المملكة العربية السعودية',
      });
      onSuccess(created.customerName, created.id);
    } else if (entityType === 'Crusher') {
      if (!crusherName.trim()) return;
      const created = addCrusher({
        crusherName,
        crusherNameEn: crusherName,
        location: crusherLocation || 'الرياض - مقالع المواد',
        bankDetails: crusherBank || 'مصرف الراجحي',
        phone: crusherPhone || '+966 50 000 0000',
        openingBalance: 0,
      });
      onSuccess(created.crusherName, created.id);
    } else if (entityType === 'Transporter') {
      if (!transporterName.trim()) return;
      const created = addTransporter({
        transporterName,
        transporterNameEn: transporterName,
        driverName: driverName || 'سائق معتمد',
        phone: transporterPhone || '+966 50 000 0000',
        truckDetails: 'مرسيدس أكتروس قلاب 32م³',
        defaultTruckNo: truckNo || '1111-أ ب ج',
        ratePerTon: Number(ratePerTon) || 18,
      });
      onSuccess(created.transporterName, created.id);
    } else if (entityType === 'Material') {
      if (!materialNameAr.trim()) return;
      const created = addMaterial({
        nameAr: materialNameAr,
        nameEn: materialNameEn || materialNameAr,
        category: materialCategory,
        defaultSellingPrice: Number(defaultSellingPrice) || 45,
        defaultPurchasePrice: Number(defaultPurchasePrice) || 26,
        unit: 'طن متري (Ton)',
      });
      onSuccess(created.nameAr, created.id);
    }

    onClose();
  };

  const getHeaderInfo = () => {
    switch (entityType) {
      case 'Customer':
        return {
          title: isAr ? 'إضافة عميل جديد سريعاً' : 'Quick Add New Client',
          subtitle: isAr ? 'تسجيل شركة أو مصنع خرسانة جديد في الدليل' : 'Register a new customer entity',
          icon: Building2,
        };
      case 'Crusher':
        return {
          title: isAr ? 'إضافة كسارة / مورد جديد' : 'Quick Add Crusher / Supplier',
          subtitle: isAr ? 'تسجيل مقلع أو مورد مواد في النظام' : 'Register a new quarry or supplier',
          icon: Database,
        };
      case 'Transporter':
        return {
          title: isAr ? 'إضافة مقاول نقل / تريلا' : 'Quick Add Transporter / Truck',
          subtitle: isAr ? 'تسجيل مؤسسة نقليات أو شاحنة نقل جديدة' : 'Register a fleet subcontractor',
          icon: Truck,
        };
      case 'Material':
        return {
          title: isAr ? 'إضافة صنف مادة جديد' : 'Quick Add Material Item',
          subtitle: isAr ? 'إدراج نوع ركام أو رمل وتسعيرته' : 'Add new aggregate or sand to catalog',
          icon: Package,
        };
    }
  };

  const { title, subtitle, icon: Icon } = getHeaderInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Fields */}
          {entityType === 'Customer' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'اسم العميل / الشركة *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: شركة اليمامة للخرسانة الجاهزة' : 'e.g. Al Yamamah ReadyMix'}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'الرقم الضريبي (15 رقم)' : 'VAT Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="300189452300003"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'رقم الهاتف / الجوال' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="+966 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'مسؤول الاتصال / الموقع' : 'Contact Person'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'م. سلطان العتيبي' : 'Eng. Sultan'}
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Crusher Fields */}
          {entityType === 'Crusher' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'اسم الكسارة / المقلع *' : 'Crusher Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: كسارة الرياض الحديثة (Riyadh Crusher)' : 'e.g. Riyadh Quarry'}
                  value={crusherName}
                  onChange={(e) => setCrusherName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'الموقع الجغرافي / الطريق' : 'Location'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'الرياض - طريق رماح - كم 25' : 'Riyadh, Rumah Road'}
                  value={crusherLocation}
                  onChange={(e) => setCrusherLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'الحساب البنكي / الآيبان' : 'Bank IBAN'}
                </label>
                <input
                  type="text"
                  placeholder="مصرف الراجحي - SA4280000123608010123456"
                  value={crusherBank}
                  onChange={(e) => setCrusherBank(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Transporter Fields */}
          {entityType === 'Transporter' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'اسم الناقل / المؤسسة *' : 'Transporter Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: مؤسسة قوافل نجد للنقليات' : 'e.g. Qawafel Najd Transport'}
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'رقم لوحة الشاحنة الافتراضية' : 'Truck Plate #'}
                  </label>
                  <input
                    type="text"
                    placeholder="4491-ق ط ب"
                    value={truckNo}
                    onChange={(e) => setTruckNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'اسم السائق' : 'Driver Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'محمد إقبال' : 'Driver Name'}
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'أجرة النقل للطن (ر.س)' : 'Rate / Ton (SAR)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={ratePerTon}
                    onChange={(e) => setRatePerTon(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    placeholder="+966 50 111 2222"
                    value={transporterPhone}
                    onChange={(e) => setTransporterPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Material Fields */}
          {entityType === 'Material' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'اسم المادة (عربي) *' : 'Material Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: حصى سن 1/2 مم' : 'Aggregate 1/2"'}
                  value={materialNameAr}
                  onChange={(e) => setMaterialNameAr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'سعر الشراء الافتراضي (ر.س/طن)' : 'Buy Price (SAR/Ton)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={defaultPurchasePrice}
                    onChange={(e) => setDefaultPurchasePrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    {isAr ? 'سعر البيع الافتراضي (ر.س/طن)' : 'Sell Price (SAR/Ton)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={defaultSellingPrice}
                    onChange={(e) => setDefaultSellingPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isAr ? 'حفظ واختيار فوري' : 'Save & Select'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
