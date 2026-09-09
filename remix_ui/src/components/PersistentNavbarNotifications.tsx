import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from './Navbar';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  UserPlus,
  Receipt,
  Truck,
  ExternalLink,
  CheckCheck,
  Filter,
  Clock,
  WifiOff,
  Building2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { UserRole } from '../types';

export interface PersistentNavbarNotificationsProps {
  setActiveTab: (tab: ActiveTab) => void;
  className?: string;
}

export type NotificationType = 'critical' | 'approval' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  timestamp: string;
  category: 'edit_request' | 'user_request' | 'voucher' | 'wastage' | 'system' | 'crusher';
  targetTab?: ActiveTab;
  canInlineApprove?: boolean;
  onApprove?: () => Promise<void> | void;
  onReject?: () => Promise<void> | void;
  meta?: Record<string, any>;
}

const STORAGE_READ_KEY = 'meayon_notifications_read_v1';
const STORAGE_DISMISSED_KEY = 'meayon_notifications_dismissed_v1';

export const PersistentNavbarNotifications: React.FC<PersistentNavbarNotificationsProps> = ({
  setActiveTab,
  className = '',
}) => {
  const {
    currentUser,
    language,
    isOnline,
    kpis,
    editRequests,
    userRequests,
    vouchers,
    activeOperations,
    approveEditRequest,
    rejectEditRequest,
    approveUserRequest,
    rejectUserRequest,
    approveVoucher,
    isAdmin,
    isCOO,
  } = useApp();

  const isAr = language === 'ar';
  const isExecutive = isAdmin || isCOO;

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'approval' | 'critical'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Persistent Read IDs
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_READ_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persistent Dismissed IDs
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DISMISSED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.warn('Failed to save read notifications:', e);
    }
  }, [readIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DISMISSED_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch (e) {
      console.warn('Failed to save dismissed notifications:', e);
    }
  }, [dismissedIds]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Build the live notification stream
  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 1. Pending Edit Requests (High Priority for Executives)
    const pendingEdits = editRequests.filter((r) => r.status === 'Pending');
    pendingEdits.forEach((r) => {
      list.push({
        id: `edit_req_${r.id}`,
        type: 'approval',
        category: 'edit_request',
        titleAr: `طلب تعديل سجل ${r.entityType === 'Operation' ? 'عملية توريد' : r.entityType}`,
        titleEn: `Edit Request: ${r.entityType}`,
        descriptionAr: `${r.diffSummary || 'طلب تعديل بيانات مدخلة'} - مقدم الطلب: ${r.requestedBy} (${r.requestedByRole})`,
        descriptionEn: `${r.diffSummary || 'Data alteration requested'} by ${r.requestedBy} (${r.requestedByRole})`,
        timestamp: r.requestedAt || new Date().toISOString(),
        targetTab: 'executive-admin',
        canInlineApprove: isExecutive,
        onApprove: () => approveEditRequest(r.id, 'Approved via Navbar Quick Action'),
        onReject: () => rejectEditRequest(r.id, 'Rejected via Navbar Quick Action'),
        meta: { reqId: r.id, entityType: r.entityType },
      });
    });

    // 2. Pending User Registration Requests
    const pendingUsers = userRequests.filter((r) => r.status === 'Pending');
    pendingUsers.forEach((u) => {
      list.push({
        id: `user_req_${u.id}`,
        type: 'approval',
        category: 'user_request',
        titleAr: `طلب تسجيل موظف جديد: ${u.fullNameAr || u.fullName}`,
        titleEn: `New User Registration: ${u.fullName}`,
        descriptionAr: `البريد: ${u.email} | الرتبة المطلوبة: ${u.requestedRole} | هاتف: ${u.phone || 'غير مسجل'}`,
        descriptionEn: `Email: ${u.email} | Role requested: ${u.requestedRole} | Phone: ${u.phone || 'N/A'}`,
        timestamp: u.requestedAt || new Date().toISOString(),
        targetTab: 'executive-admin',
        canInlineApprove: isExecutive,
        onApprove: () => approveUserRequest(u.id, u.requestedRole),
        onReject: () => rejectUserRequest(u.id),
        meta: { userId: u.id, email: u.email },
      });
    });

    // 3. Financial Vouchers Requiring Approval
    const pendingVouchers = vouchers.filter(
      (v) => v.status === 'Pending_Approval' || (!v.isApproved && v.status !== 'Cancelled')
    );
    pendingVouchers.forEach((v) => {
      list.push({
        id: `voucher_${v.id}`,
        type: 'approval',
        category: 'voucher',
        titleAr: `سند ${v.type === 'Payment' ? 'صرف' : 'قبض'} (${v.voucherNumber}) بانتظار الاعتماد المالي`,
        titleEn: `Voucher #${v.voucherNumber} (${v.type}) Awaiting Approval`,
        descriptionAr: `المستفيد: ${v.partyName} | المبلغ: ${v.amount.toLocaleString()} ر.س | الغرض: ${v.purpose}`,
        descriptionEn: `Beneficiary: ${v.partyName} | Amount: ${v.amount.toLocaleString()} SAR | Purpose: ${v.purpose}`,
        timestamp: v.created_at || v.date || new Date().toISOString(),
        targetTab: 'vouchers',
        canInlineApprove: isExecutive,
        onApprove: async () => {
          await approveVoucher(v.id, 'Approved via Navbar Quick Action');
        },
        meta: { voucherId: v.id, amount: v.amount },
      });
    });

    // 4. Critical Weighbridge Wastage Alerts (Wastage >= 1.0 Ton or Ratio > 2.5%)
    const highWastageOps = activeOperations
      .filter((op) => {
        const wastage = op.qty_wastage || 0;
        const loaded = op.qty_loaded || 1;
        return wastage >= 1.0 || wastage / loaded >= 0.025;
      })
      .slice(0, 5); // Take top 5 to avoid bloating

    highWastageOps.forEach((op) => {
      const wastagePct = op.wastage_percentage ? op.wastage_percentage.toFixed(1) : op.qty_loaded > 0 ? ((op.qty_wastage / op.qty_loaded) * 100).toFixed(1) : '0';
      const truckId = op.truck_no || 'غير محدد';
      const customer = op.destination_customer || 'غير محدد';
      const quarry = op.loading_source || 'غير محدد';
      const carrier = op.transporter_name || 'غير محدد';
      list.push({
        id: `waste_alert_${op.id}`,
        type: 'critical',
        category: 'wastage',
        titleAr: `تنبيه فاقد وزن حرج (${op.qty_wastage.toFixed(2)} طن) - شاحنة ${truckId}`,
        titleEn: `Critical Wastage Alert (${op.qty_wastage.toFixed(2)} T) - Truck ${truckId}`,
        descriptionAr: `العميل: ${customer} | الكسارة: ${quarry} | نسبة النقص: ${wastagePct}% | الناقل: ${carrier}`,
        descriptionEn: `Client: ${customer} | Quarry: ${quarry} | Loss Rate: ${wastagePct}% | Transporter: ${carrier}`,
        timestamp: op.loading_date || op.date || new Date().toISOString(),
        targetTab: 'transporters',
        meta: { operationId: op.id, wastage: op.qty_wastage },
      });
    });

    // 5. Offline System Warning
    if (!isOnline) {
      list.unshift({
        id: 'sys_offline_alert',
        type: 'critical',
        category: 'system',
        titleAr: 'النظام يعمل دون اتصال بالإنترنت (Offline Mode)',
        titleEn: 'System Operating Offline',
        descriptionAr: 'يتم حفظ كافة القيود وبطاقات الوزن محلياً في ذاكرة التخزين المؤقت. ستتم المزامنة المركزية تلقائياً عند استعادة الاتصال.',
        descriptionEn: 'Operating in local offline cache. Weighbridge tickets and records will automatically synchronize once online.',
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Quarry Payable Overdue Balance Alert (> 100,000 SAR)
    if (kpis.crusherPayableBalance > 100000) {
      list.push({
        id: 'sys_crusher_debt_alert',
        type: 'warning',
        category: 'crusher',
        titleAr: `تراكم مستحقات الكسارات: ${kpis.crusherPayableBalance.toLocaleString()} ر.س`,
        titleEn: `Quarry Payable Balance Exceeds Threshold: ${kpis.crusherPayableBalance.toLocaleString()} SAR`,
        descriptionAr: 'تجاوز رصيد المطالبات غير المسددة للكسارات الحد المعتمد. يرجى مراجعة كشوفات الحساب وسداد الدفعات.',
        descriptionEn: 'Crusher claims balance has exceeded operating threshold. Review ledger statements and process settlements.',
        timestamp: new Date().toISOString(),
        targetTab: 'crushers',
      });
    }

    return list;
  }, [
    editRequests,
    userRequests,
    vouchers,
    activeOperations,
    isOnline,
    kpis.crusherPayableBalance,
    isExecutive,
    approveEditRequest,
    rejectEditRequest,
    approveUserRequest,
    rejectUserRequest,
    approveVoucher,
  ]);

  // Filtered by user dismissals
  const activeNotifications = useMemo(() => {
    return notifications.filter((n) => !dismissedIds.has(n.id));
  }, [notifications, dismissedIds]);

  // Tab counts
  const pendingApprovalsCount = useMemo(() => {
    return activeNotifications.filter((n) => n.type === 'approval').length;
  }, [activeNotifications]);

  const criticalAlertsCount = useMemo(() => {
    return activeNotifications.filter((n) => n.type === 'critical').length;
  }, [activeNotifications]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !readIds.has(n.id)).length;
  }, [activeNotifications, readIds]);

  // Filtered display list
  const displayList = useMemo(() => {
    if (filter === 'approval') {
      return activeNotifications.filter((n) => n.type === 'approval');
    }
    if (filter === 'critical') {
      return activeNotifications.filter((n) => n.type === 'critical' || n.type === 'warning');
    }
    return activeNotifications;
  }, [activeNotifications, filter]);

  // Actions
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReadIds((prev) => new Set([...prev, id]));
  };

  const handleMarkAllAsRead = () => {
    const allIds = activeNotifications.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...allIds]));
  };

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleInlineAction = async (
    item: NotificationItem,
    action: 'approve' | 'reject',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setProcessingId(item.id);
    try {
      if (action === 'approve' && item.onApprove) {
        await item.onApprove();
      } else if (action === 'reject' && item.onReject) {
        await item.onReject();
      }
      // Mark as read after action
      setReadIds((prev) => new Set([...prev, item.id]));
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleNavigate = (item: NotificationItem) => {
    if (item.targetTab) {
      setActiveTab(item.targetTab);
      handleMarkAsRead(item.id);
      setIsOpen(false);
    }
  };

  // Helper for Category Icons
  const renderCategoryIcon = (type: NotificationType, category: string) => {
    switch (category) {
      case 'edit_request':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'user_request':
        return <UserPlus className="h-4 w-4 text-violet-600" />;
      case 'voucher':
        return <Receipt className="h-4 w-4 text-emerald-600" />;
      case 'wastage':
        return <Truck className="h-4 w-4 text-rose-600" />;
      case 'system':
        return <WifiOff className="h-4 w-4 text-rose-600" />;
      case 'crusher':
        return <Building2 className="h-4 w-4 text-amber-600" />;
      default:
        return type === 'critical' ? (
          <AlertOctagon className="h-4 w-4 text-rose-600" />
        ) : (
          <Bell className="h-4 w-4 text-slate-600" />
        );
    }
  };

  return (
    <div className={`relative flex items-center gap-2 ${className}`} ref={popoverRef}>
      {/* ======================================================== */}
      {/* 1. PERSISTENT FAST ALERT PILL IN NAVBAR (When tasks exist) */}
      {/* ======================================================== */}
      {pendingApprovalsCount > 0 && (
        <button
          type="button"
          id="nav-quick-approval-pill"
          onClick={() => {
            setFilter('approval');
            setIsOpen(true);
          }}
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 text-[11px] font-bold text-orange-950 shadow-xs hover:border-orange-300 hover:shadow-sm transition-all"
          title={
            isAr
              ? `يوجد ${pendingApprovalsCount} مهام اعتماد معلقة تحتاج إلى مراجعة`
              : `${pendingApprovalsCount} pending approval tasks require attention`
          }
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-600"></span>
          </span>
          <span>
            {isAr
              ? `${pendingApprovalsCount} مهام معلقة`
              : `${pendingApprovalsCount} Pending Tasks`}
          </span>
        </button>
      )}

      {criticalAlertsCount > 0 && (
        <button
          type="button"
          id="nav-quick-critical-pill"
          onClick={() => {
            setFilter('critical');
            setIsOpen(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-900 shadow-xs hover:border-rose-300 hover:bg-rose-100/70 transition-all animate-pulse"
          title={
            isAr
              ? `يوجد ${criticalAlertsCount} تنبيهات حرجة في النظام (فاقد وزن أو انقطاع شبكة)`
              : `${criticalAlertsCount} critical system alerts active`
          }
        >
          <AlertOctagon className="h-3 w-3 text-rose-600" />
          <span>
            {isAr
              ? `${criticalAlertsCount} تنبيه حرج`
              : `${criticalAlertsCount} Critical`}
          </span>
        </button>
      )}

      {/* ======================================================== */}
      {/* 2. THE MAIN NAVBAR BELL ICON BUTTON                      */}
      {/* ======================================================== */}
      <button
        id="nav-notifications-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isAr ? 'الإشعارات والتنبيهات' : 'System Notifications'}
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
          isOpen
            ? 'border-orange-400 bg-orange-50 text-orange-950 shadow-xs ring-2 ring-orange-200'
            : unreadCount > 0
            ? 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-950'
            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        title={
          isAr
            ? `مركز التنبيهات والاعتمادات (${unreadCount} غير مقروء)`
            : `Notifications & Approvals Center (${unreadCount} unread)`
        }
      >
        <Bell className="h-4 w-4" />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span
            id="nav-notification-badge-counter"
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-xs"
          >
            {unreadCount > 99 ? '+99' : unreadCount}
          </span>
        )}

        {/* Subtle pulsing indicator if critical items exist */}
        {criticalAlertsCount > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
        )}
      </button>

      {/* ======================================================== */}
      {/* 3. PERSISTENT NOTIFICATION FLYOUT POPOVER               */}
      {/* ======================================================== */}
      {isOpen && (
        <div
          id="nav-notifications-popover"
          dir={isAr ? 'rtl' : 'ltr'}
          className={`absolute top-11 ${
            isAr ? 'left-0' : 'right-0'
          } z-50 w-[380px] sm:w-[440px] max-w-[95vw] rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden`}
        >
          {/* Popover Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 flex items-center justify-between backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#F05627]">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  {isAr ? 'مركز التنبيهات والاعتمادات' : 'Notifications & Approvals'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? `${activeNotifications.length} إشعار نشط (${unreadCount} غير مقروء)`
                    : `${activeNotifications.length} active alerts (${unreadCount} unread)`}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors"
                title={isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              >
                <CheckCheck className="h-3 w-3 text-emerald-600" />
                <span>{isAr ? 'قراءة الكل' : 'Mark read'}</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex border-b border-slate-100 bg-white px-3 py-1.5 gap-1 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              id="filter-all-btn"
              onClick={() => setFilter('all')}
              className={`flex-1 rounded-lg px-2.5 py-1 text-center transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {isAr ? 'الكل' : 'All'} ({activeNotifications.length})
            </button>

            <button
              type="button"
              id="filter-approvals-btn"
              onClick={() => setFilter('approval')}
              className={`flex-1 rounded-lg px-2.5 py-1 text-center transition-all ${
                filter === 'approval'
                  ? 'bg-[#F05627] text-white shadow-xs'
                  : 'hover:bg-orange-50 text-orange-950'
              }`}
            >
              {isAr ? 'الاعتمادات' : 'Approvals'} ({pendingApprovalsCount})
            </button>

            <button
              type="button"
              id="filter-critical-btn"
              onClick={() => setFilter('critical')}
              className={`flex-1 rounded-lg px-2.5 py-1 text-center transition-all ${
                filter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'hover:bg-rose-50 text-rose-900'
              }`}
            >
              {isAr ? 'الحرجة' : 'Critical'} ({criticalAlertsCount})
            </button>
          </div>

          {/* Notifications List */}
          <div
            id="nav-notifications-scroll-area"
            className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 scrollbar-thin"
          >
            {displayList.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {isAr ? 'جميع التنبيهات مكتملة ومحدّثة' : 'All caught up!'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {isAr
                    ? 'لا توجد مهام اعتماد معلقة أو تنبيهات فاقد حرجة تتطلب تدخلك الآن.'
                    : 'No pending approvals or critical system alerts requiring action.'}
                </p>
              </div>
            ) : (
              displayList.map((item) => {
                const isRead = readIds.has(item.id);
                const isProcessing = processingId === item.id;

                // Color themes by type
                const borderClass =
                  item.type === 'critical'
                    ? 'border-r-4 border-rose-500 bg-rose-50/40'
                    : item.type === 'approval'
                    ? 'border-r-4 border-orange-500 bg-orange-50/40'
                    : item.type === 'warning'
                    ? 'border-r-4 border-amber-400 bg-amber-50/40'
                    : 'border-r-4 border-blue-400 bg-blue-50/30';

                return (
                  <div
                    key={item.id}
                    id={`notif-card-${item.id}`}
                    onClick={() => handleNavigate(item)}
                    className={`group relative rounded-xl border border-slate-200/80 p-3 transition-all ${borderClass} ${
                      isRead ? 'opacity-75 hover:opacity-100' : 'shadow-xs'
                    } ${item.targetTab ? 'cursor-pointer hover:border-slate-300 hover:bg-white' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icon */}
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs border border-slate-200">
                        {renderCategoryIcon(item.type, item.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className={`text-xs font-bold truncate ${
                              item.type === 'critical'
                                ? 'text-rose-950'
                                : item.type === 'approval'
                                ? 'text-orange-950'
                                : 'text-slate-900'
                            }`}
                          >
                            {isAr ? item.titleAr : item.titleEn}
                          </h4>

                          {/* Unread indicator dot */}
                          {!isRead && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-orange-500"
                              title={isAr ? 'إشعار جديد وغير مقروء' : 'Unread'}
                            />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {isAr ? item.descriptionAr : item.descriptionEn}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {item.timestamp ? item.timestamp.split('T')[0] : 'اليوم'}
                            </span>
                          </span>

                          {item.targetTab && (
                            <span className="flex items-center gap-0.5 text-slate-500 group-hover:text-orange-600 font-semibold">
                              <span>{isAr ? 'عرض التفاصيل' : 'View'}</span>
                              {isAr ? (
                                <ChevronLeft className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Inline Actions (Approval / Rejection) */}
                        {item.canInlineApprove && (
                          <div className="mt-2.5 flex items-center gap-2 border-t border-slate-200/60 pt-2">
                            <button
                              type="button"
                              id={`approve-btn-${item.id}`}
                              disabled={isProcessing}
                              onClick={(e) => handleInlineAction(item, 'approve', e)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{isProcessing ? '...' : isAr ? 'اعتماد فوري' : 'Approve'}</span>
                            </button>

                            {item.onReject && (
                              <button
                                type="button"
                                id={`reject-btn-${item.id}`}
                                disabled={isProcessing}
                                onClick={(e) => handleInlineAction(item, 'reject', e)}
                                className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>{isAr ? 'رفض' : 'Reject'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              id={`read-btn-${item.id}`}
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                              title={isAr ? 'تحديد كمقروء' : 'Mark as read'}
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="border-t border-slate-100 bg-slate-50/90 p-2.5 flex items-center justify-between text-xs">
            <button
              type="button"
              id="nav-go-executive-admin-btn"
              onClick={() => {
                setActiveTab('executive-admin');
                setIsOpen(false);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-[#F05627] hover:underline"
            >
              <span>{isAr ? 'الانتقال إلى سجل التدقيق والاعتمادات الشامل' : 'All Approvals & Audit Trail'}</span>
              <ExternalLink className="h-3 w-3" />
            </button>

            <span className="text-[10px] text-slate-400">
              {isAr ? 'تحديث حي' : 'Live Sync'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
