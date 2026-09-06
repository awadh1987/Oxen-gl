import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  RefreshCw,
  ExternalLink,
  Trash2,
  FileText,
  FileSpreadsheet,
  Database,
  X,
  Lock,
  ArrowRight,
  FolderArchive,
  DownloadCloud,
} from 'lucide-react';
import {
  isDriveAuthenticated,
  connectGoogleDrive,
  listDriveErpFiles,
  uploadFileToDrive,
  deleteDriveFile,
  GoogleDriveFile,
} from '../services/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const { language, activeTenantLicense, activeTenantId, operations, customers, crushers, transporters } = useApp();
  const isAr = language === 'ar';

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkConnectionAndLoad = useCallback(async () => {
    const authenticated = isDriveAuthenticated();
    setIsConnected(authenticated);
    if (authenticated) {
      setIsLoading(true);
      try {
        const fileList = await listDriveErpFiles();
        setFiles(fileList);
      } catch (err) {
        console.error('Failed to load drive files:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void checkConnectionAndLoad();
    }
  }, [isOpen, checkConnectionAndLoad]);

  const handleConnect = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const ok = await connectGoogleDrive();
      if (ok) {
        setIsConnected(true);
        setStatusMessage({
          type: 'success',
          text: isAr ? 'تم الاتصال بحساب Google Drive بنجاح!' : 'Successfully connected to Google Drive!',
        });
        await checkConnectionAndLoad();
      } else {
        setStatusMessage({
          type: 'error',
          text: isAr ? 'تعذر إتمام الربط مع Google Drive.' : 'Could not complete Google Drive authorization.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (isAr ? 'حدث خطأ أثناء الاتصال بجوجل درايف' : 'Error connecting to Google Drive'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!isConnected) return;
    setIsUploading(true);
    setStatusMessage(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = {
        tenantId: activeTenantId,
        companyName: activeTenantLicense?.companyName || 'Mayon Economic Co.',
        exportedAt: new Date().toISOString(),
        metadata: {
          totalOperations: operations.length,
          totalCustomers: customers.length,
          totalCrushers: crushers.length,
          totalTransporters: transporters.length,
        },
        data: {
          operations,
          customers,
          crushers,
          transporters,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = `Meayon-ERP-Backup-${activeTenantId}-${timestamp}.json`;

      const result = await uploadFileToDrive(
        jsonStr,
        fileName,
        'application/json',
        `نسخة احتياطية شاملة لمنشأة ${activeTenantLicense?.companyName || activeTenantId}`
      );

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: isAr
            ? `تم رفع النسخة الاحتياطية (${fileName}) بنجاح إلى مجلد ميون في Google Drive!`
            : `Backup (${fileName}) uploaded successfully to Google Drive!`,
        });
        await checkConnectionAndLoad();
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || (isAr ? 'تعذر رفع النسخة الاحتياطية.' : 'Backup upload failed.'),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (isAr ? 'فشلت عملية الرفع.' : 'Upload operation failed.'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !isConnected) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const result = await uploadFileToDrive(
        selectedFile,
        selectedFile.name,
        selectedFile.type || 'application/octet-stream',
        'مستند مرفوع يدوياً من واجهة ميون ERP'
      );

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: isAr
            ? `تم رفع الملف (${selectedFile.name}) بنجاح إلى مجلد الأرشيف في Google Drive!`
            : `File (${selectedFile.name}) uploaded successfully!`,
        });
        await checkConnectionAndLoad();
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || (isAr ? 'تعذر رفع الملف.' : 'File upload failed.'),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || (isAr ? 'حدث خطأ أثناء رفع الملف' : 'Upload error'),
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (file: GoogleDriveFile) => {
    const success = await deleteDriveFile(file.id, file.name);
    if (success) {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setStatusMessage({
        type: 'success',
        text: isAr ? `تم حذف "${file.name}" من Google Drive.` : `Deleted "${file.name}" from Google Drive.`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="google-drive-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        id="google-drive-modal-container"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with Deep Blue / Violet Gradient */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide">
                  {isAr ? 'أرشيف ومزامنة Google Drive السحابية' : 'Google Drive Cloud Sync & Archive'}
                </h2>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-400/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isAr
                  ? 'تخزين وحفظ النسخ الاحتياطية المعتمدة، الفواتير، وتقارير العمليات في حسابك السحابي'
                  : 'Backup daily logs, customer invoices, and enterprise reports directly to your Google Drive'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Connection Status Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isConnected ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {isAr ? 'حالة الربط بحساب Google Drive' : 'Google Drive Authorization Status'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isConnected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isConnected ? (isAr ? 'متصل ومفعل' : 'Connected') : (isAr ? 'غير متصل' : 'Disconnected')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isConnected
                      ? isAr
                        ? 'يتم تخزين الملفات تلقائياً في مجلد: "Meayon ERP - أرشيف سحابي"'
                        : 'Files are automatically saved into: "Meayon ERP - أرشيف سحابي"'
                      : isAr
                      ? 'قم بربط حسابك لحفظ النسخ الاحتياطية والتقارير المالية مباشرة في جوجل درايف'
                      : 'Connect your Google account to enable cloud backups and automated file archives'}
                  </p>
                </div>
              </div>

              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                  <span>{isAr ? 'ربط الحساب الآن' : 'Authorize Drive'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={checkConnectionAndLoad}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title={isAr ? 'تحديث قائمة الملفات' : 'Refresh file list'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          {isConnected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* One-Click Backup Card */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1.5">
                    <Database className="h-4 w-4 text-indigo-600" />
                    <span>{isAr ? 'نسخ احتياطي فوري للنظام' : 'Instant System Backup'}</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600 mb-3">
                    {isAr
                      ? 'توليد ملف JSON متكامل يتضمن كافة العمليات الميدانية، قيود المحاسبة، وسجل الكسارات ورفعه لدرايف.'
                      : 'Generate a comprehensive snapshot of all operations, vouchers, and customer ledgers and sync to Drive.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackupToDrive}
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  <span>{isAr ? 'رفع نسخة احتياطية الآن' : 'Upload Backup to Drive'}</span>
                </button>
              </div>

              {/* Manual File Upload Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1.5">
                    <FolderArchive className="h-4 w-4 text-[#F05627]" />
                    <span>{isAr ? 'رفع مستند أو تقرير يدوي' : 'Upload Manual Document'}</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600 mb-3">
                    {isAr
                      ? 'اختر أي ملف PDF، Excel، أو صورة تذكرة ميزان من جهازك لحفظها مباشرة في أرشيف درايف.'
                      : 'Upload any local PDF invoice, dispatch Excel sheet, or weighbridge scan directly into your Drive.'}
                  </p>
                </div>

                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer">
                  <UploadCloud className="h-4 w-4 text-slate-500" />
                  <span>{isAr ? 'استعراض ملف للرفع' : 'Choose File to Upload'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Cloud Files Archive List */}
          {isConnected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isAr ? 'الملفات المخزنة في مجلد ميون السحابي' : 'Files in Meayon Drive Archive'}
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {files.length} {isAr ? 'ملفات' : 'files'}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">
                    {isAr ? 'جاري جلب الملفات من Google Drive...' : 'Loading files from Google Drive...'}
                  </p>
                </div>
              ) : files.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500">
                  <Cloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {isAr ? 'لم يتم حفظ أي ملفات في الأرشيف السحابي حتى الآن' : 'No files saved in your Drive archive yet'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isAr
                      ? 'استخدم زر النسخ الاحتياطي أعلاه أو خيار "حفظ في Google Drive" من نافذة التصدير'
                      : 'Use the backup button above or select "Save to Drive" from the export modal'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {files.map((file) => {
                      const isJson = file.name.endsWith('.json');
                      const isPdf = file.name.endsWith('.pdf');
                      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');

                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              {isJson ? (
                                <Database className="h-4 w-4 text-indigo-600" />
                              ) : isPdf ? (
                                <FileText className="h-4 w-4 text-rose-600" />
                              ) : isExcel ? (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-slate-500" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                                {file.modifiedTime && (
                                  <span>{new Date(file.modifiedTime).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
                                )}
                                {file.size && (
                                  <>
                                    <span>•</span>
                                    <span>{(Number(file.size) / 1024).toFixed(1)} KB</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                title={isAr ? 'فتح في Google Drive' : 'Open in Drive'}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(file)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title={isAr ? 'حذف من Google Drive' : 'Delete file'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Cloud className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {isAr ? 'مؤمّن بواسطة بروتوكول OAuth 2.0 من Google' : 'Secured via official Google OAuth 2.0'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
