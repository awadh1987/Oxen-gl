import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { apiService } from './services/api';
import { LoginView } from './views/LoginView';
import { PublicSharedInvoiceView } from './views/PublicSharedInvoiceView';
import { OxenGLPortalView } from './views/OxenGLPortalView';
import { OxenGLPlatformLayout } from './layouts/OxenGLPlatformLayout';
import { TenantWorkspaceLayout } from './layouts/TenantWorkspaceLayout';
import { useOxenThemeEngine } from './hooks/useOxenThemeEngine';

function AppRouter() {
  const { language, currentUser, setCurrentUser, isPlatformSuperAdmin, activeTenantId } = useApp();
  const tenantLicenseKey = localStorage.getItem('tenant_license_key') || undefined;
  useOxenThemeEngine(tenantLicenseKey);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => apiService.isAuthenticated());
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  const handleLogout = () => {
    localStorage.removeItem('meayon_session_active');
    localStorage.removeItem('meayon_session_user');
    localStorage.removeItem('meayon_user');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const profile = await apiService.getCurrentUser();
        if (!profile) {
          localStorage.removeItem('meayon_session_active');
          setIsLoggedIn(false);
          setIsBootstrapping(false);
          return;
        }

        setCurrentUser({
          id: profile.id || profile.email,
          username: profile.username || profile.email?.split('@')[0] || 'user',
          fullName: profile.fullName || profile.fullNameAr || profile.email,
          fullNameAr: profile.fullNameAr || profile.fullName || profile.email,
          email: profile.email,
          role: (profile.role || 'Admin') as any,
          status: profile.status || 'Active',
          tenantId: profile.tenantId || 'tenant-default-001',
          tenantRole: profile.tenantRole || 'Admin',
          isPlatformSuperAdmin: profile.isPlatformSuperAdmin ?? (profile.role === 'Admin'),
        });
        localStorage.setItem('meayon_session_active', 'true');
        setIsLoggedIn(true);
      } catch {
        apiService.logout();
        setIsLoggedIn(false);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();
  }, [setCurrentUser]);

  // Check URL for public shared invoice link (?shared_invoice=INV-2026-08-1048&token=...)
  const [sharedInvoiceParams, setSharedInvoiceParams] = useState<{
    invoiceNumber: string;
    token?: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedInv = urlParams.get('shared_invoice');
      const token = urlParams.get('token') || undefined;
      if (sharedInv) {
        return { invoiceNumber: sharedInv, token };
      }
    }
    return null;
  });

  // If a public shared invoice link was accessed, render the standalone auditor view
  if (sharedInvoiceParams) {
    return (
      <PublicSharedInvoiceView
        invoiceNumber={sharedInvoiceParams.invoiceNumber}
        token={sharedInvoiceParams.token}
        onBackToPortal={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setSharedInvoiceParams(null);
        }}
      />
    );
  }

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs font-bold text-slate-300">
            {language === 'ar' ? 'جارٍ تهيئة بيئة العمل السحابية...' : 'Initializing cloud workspace...'}
          </p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = Boolean(isPlatformSuperAdmin || currentUser?.role === 'Admin');

  return (
    <Routes>
      {/* Dedicated Tenant-Specific Login Route */}
      <Route
        path="/login/:tenantId"
        element={<LoginView onLoginSuccess={() => setIsLoggedIn(true)} />}
      />

      {/* Global / Default Login Route: Redirect to Central Unified Portal */}
      <Route
        path="/login"
        element={<Navigate to="/portal" replace />}
      />

      {/* Central OxenGL Portal Gateway (Primary Landing & Multi-Tenant Gateway) */}
      <Route
        path="/portal"
        element={<OxenGLPortalView onLogout={handleLogout} />}
      />

      {/* Platform Super Admin Master Console */}
      <Route
        path="/platform/*"
        element={
          !isLoggedIn ? (
            <Navigate to="/login/oxengl-platform" replace />
          ) : isSuperAdmin ? (
            <OxenGLPlatformLayout onLogout={handleLogout} />
          ) : (
            <Navigate to={`/workspace/${activeTenantId && activeTenantId !== 'oxengl-platform' ? activeTenantId : 'tenant-default-001'}`} replace />
          )
        }
      />

      {/* Tenant Workspace with Tenant ID Parameter */}
      <Route
        path="/workspace/:tenantId/*"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : (
            <TenantWorkspaceLayout onLogout={handleLogout} />
          )
        }
      />

      {/* Tenant Workspace Fallback Redirect */}
      <Route
        path="/workspace"
        element={
          !isLoggedIn ? (
            <Navigate to="/portal" replace />
          ) : (
            <Navigate to={`/workspace/${activeTenantId && activeTenantId !== 'oxengl-platform' ? activeTenantId : 'tenant-default-001'}`} replace />
          )
        }
      />
      <Route
        path="/workspace/*"
        element={
          !isLoggedIn ? (
            <Navigate to="/portal" replace />
          ) : (
            <Navigate to={`/workspace/${activeTenantId && activeTenantId !== 'oxengl-platform' ? activeTenantId : 'tenant-default-001'}`} replace />
          )
        }
      />

      {/* Root & Catch-All Routing: Always default to OxenGL Portal */}
      <Route
        path="/"
        element={<Navigate to="/portal" replace />}
      />
      <Route
        path="*"
        element={<Navigate to="/portal" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProvider>
  );
}
