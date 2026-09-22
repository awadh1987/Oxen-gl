import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  CalendarCheck,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Download,
  Clock,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { BulkImportModal } from '../components/BulkImportModal';

interface EmployeeRecord {
  id: string;
  employeeNumber: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  departmentAr: string;
  departmentEn: string;
  baseSalary: number;
  attendanceRate: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  iqamaOrNationalId: string;
}

export const HRMSView: React.FC = () => {
  const { language, themeMode } = useApp();
  const isAr = language === 'ar';
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'attendance'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [employees] = useState<EmployeeRecord[]>([
    {
      id: 'emp-01',
      employeeNumber: 'EMP-0412',
      nameAr: 'أحمد بن خالد التميمي',
      nameEn: 'Ahmed Al-Tamimi',
      roleAr: 'مشرف عمليات الميزان والقبان',
      roleEn: 'Weighbridge Operations Supervisor',
      departmentAr: 'العمليات اللوجستية',
      departmentEn: 'Logistics Operations',
      baseSalary: 12500,
      attendanceRate: 98.5,
      status: 'ACTIVE',
      iqamaOrNationalId: '1092837461',
    },
    {
      id: 'emp-02',
      employeeNumber: 'EMP-0418',
      nameAr: 'محمد عبد الله الشمري',
      nameEn: 'Mohammed Al-Shammari',
      roleAr: 'محاسب مالي أول',
      roleEn: 'Senior Financial Accountant',
      departmentAr: 'الإدارة المالية',
      departmentEn: 'Finance & Accounts',
      baseSalary: 14000,
      attendanceRate: 100,
      status: 'ACTIVE',
      iqamaOrNationalId: '1084729104',
    },
    {
      id: 'emp-03',
      employeeNumber: 'EMP-0425',
      nameAr: 'طارق سيف الزهراني',
      nameEn: 'Tariq Al-Zahrani',
      roleAr: 'مدير حركة الأسطول والشاحنات',
      roleEn: 'Fleet Movement Controller',
      departmentAr: 'الأسطول والنقل',
      departmentEn: 'Fleet Dispatch',
      baseSalary: 11000,
      attendanceRate: 96.0,
      status: 'ACTIVE',
      iqamaOrNationalId: '1073829105',
    },
  ]);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.nameAr.includes(searchTerm) ||
      emp.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="hrms-view">
      {/* Top Header Card */}
      <div
        className={`flex flex-col justify-between gap-4 rounded-3xl border p-6 shadow-xs transition-colors sm:flex-row sm:items-center ${
          isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-[#F05627]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'الموارد البشرية والرواتب (HR & Payroll)' : 'Human Resources & Payroll'}
              </h1>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                WPS Compliant (GOSI)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'إدارة شؤون الموظفين، سجلات البصمة والحضور البيومتري، ومسيرات الرواتب المتوافقة مع نظام حماية الأجور (WPS)'
                : 'Personnel Directory, Biometric Attendance Logs, and Automated GOSI/WPS Payroll Ledger Integration'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Universal Bulk Import Button (REM-P7) */}
          <button
            id="bulk-import-hrms-btn"
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-colors"
            title={isAr ? 'استيراد بيانات الموظفين والرواتب وقاعدة البيانات الشاملة (CSV / Excel)' : 'Bulk Import (CSV/Excel)'}
          >
            <Upload className="h-4 w-4 text-emerald-700" />
            <span>{isAr ? 'استيراد بيانات / Bulk Import (CSV/Excel)' : 'Bulk Import (CSV/Excel)'}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'إضافة موظف جديد' : 'Add Employee'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'إجمالي الكادر الوظيفي' : 'Total Personnel'}
          </span>
          <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            32 {isAr ? 'موظفاً' : 'Employees'}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'نسبة الحضور البيومتري' : 'Biometric Attendance Rate'}
          </span>
          <p className="mt-1 text-lg font-black text-emerald-600">98.2%</p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'إجمالي مسير رواتب الشهر' : 'Monthly Payroll Run'}
          </span>
          <p className="mt-1 text-lg font-black text-[#F05627]">
            {formatCurrency(375000, language)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isDark ? 'border-slate-800 bg-[#141726]' : 'border-slate-200/80 bg-white'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500">
            {isAr ? 'حالة التوافق مع WPS' : 'WPS Compliance'}
          </span>
          <p className="mt-1 text-lg font-black text-emerald-600">100% {isAr ? 'معتمد' : 'Verified'}</p>
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
            onClick={() => setActiveTab('employees')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'employees'
                ? 'bg-slate-900 text-white dark:bg-orange-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'دليل الموظفين' : 'Employee Directory'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === 'payroll'
                ? 'bg-slate-900 text-white dark:bg-orange-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مسيرات الرواتب (WPS)' : 'Payroll Runs'}
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالاسم أو الرقم الوظيفي...' : 'Search employee name or ID...'}
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
                <th className="py-3 px-4">{isAr ? 'الرقم الوظيفي' : 'Emp ID'}</th>
                <th className="py-3 px-4">{isAr ? 'اسم الموظف' : 'Employee Name'}</th>
                <th className="py-3 px-4">{isAr ? 'المسمى الوظيفي' : 'Designation'}</th>
                <th className="py-3 px-4">{isAr ? 'القسم' : 'Department'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الراتب الأساسي' : 'Base Salary'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'نسبة الحضور' : 'Attendance'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {emp.employeeNumber}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? emp.nameAr : emp.nameEn}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {isAr ? emp.roleAr : emp.roleEn}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {isAr ? emp.departmentAr : emp.departmentEn}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(emp.baseSalary, language)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                    {emp.attendanceRate}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Bulk Import Modal (REM-P7) */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        defaultCategory="partners"
      />
    </div>
  );
};
