import React, { useState } from 'react';
import { auth, googleProvider, signInWithGoogle, signOutFirebase } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useApp } from '../context/AppContext';

interface LoginButtonProps {
  onSuccess?: (user?: any) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline';
  text?: string;
  showIcon?: boolean;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  onSuccess,
  className = '',
  variant = 'primary',
  text,
  showIcon = true,
}) => {
  const { language, setUsers, setCurrentUser, logAuditAction } = useApp();
  const isAr = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. إظهار نافذة تسجيل دخول جوجل (Firebase Popup)
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      let idToken = '';
      try {
        idToken = await user.getIdToken();
      } catch (tokErr) {
        console.warn('Could not extract idToken:', tokErr);
      }

      // 2. إرسال التوكن إلى الخادم للتحقق من الصلاحيات وحالة الحساب
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: user.email,
          name: user.displayName,
          uid: user.uid,
          photoURL: user.photoURL,
        }),
      });

      const data = await response.json();

      // 3. معالجة الاستجابة وتوجيه المستخدم أو إخطاره
      if (response.status === 200 && (data.status === 'Active' || data.user?.status === 'ACTIVE' || data.user?.status === 'Active')) {
        const verifiedUser = data.user || {
          id: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Google User',
          fullNameAr: user.displayName || 'مستخدم جوجل المعتمد',
          role: 'Admin',
          status: 'Active',
          avatar: user.photoURL || undefined,
          firebaseUid: user.uid,
        };

        // تحديث حالة المستخدمين
        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.email === verifiedUser.email);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...verifiedUser };
            return copy;
          }
          return [...prev, verifiedUser];
        });

        setCurrentUser(verifiedUser);

        logAuditAction({
          userId: verifiedUser.id,
          userName: verifiedUser.fullNameAr || verifiedUser.fullName,
          userRole: verifiedUser.role,
          action: 'LOGIN',
          entityType: 'User',
          entityId: verifiedUser.id,
          summary: `تسجيل الدخول الناجح عبر مصادقة Google (${user.email})`,
        });

        if (onSuccess) {
          onSuccess(verifiedUser);
        }
      } else if (response.status === 201 || response.status === 403 || data.status === 'PENDING' || data.user?.status === 'PENDING') {
        const msg = data.message || (isAr ? 'حسابك لا يزال قيد المراجعة من قبل المدير العام.' : 'Your account is pending review by the Administrator.');
        setErrorMessage(msg);
        alert(msg);
        await signOutFirebase();
      } else {
        const msg = data.message || (isAr ? 'فشل التحقق من حساب المستخدم.' : 'User authentication check failed.');
        setErrorMessage(msg);
        alert(msg);
        await signOutFirebase();
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      const msg = isAr ? 'حدث خطأ أثناء محاولة تسجيل الدخول.' : 'An error occurred during sign-in.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const defaultStyles = {
    primary:
      'flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-500/40 disabled:opacity-50',
    secondary:
      'flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:border-orange-500 disabled:opacity-50',
    dark: 'flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:border-orange-500 disabled:opacity-50',
    outline:
      'flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50',
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className={className || defaultStyles[variant]}
      >
        {showIcon && (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>
          {loading
            ? isAr
              ? 'جاري التحقق عبر Google Firebase...'
              : 'Verifying with Google Firebase...'
            : text || (isAr ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google')}
        </span>
      </button>

      {errorMessage && (
        <p className="mt-2 text-center text-xs font-semibold text-rose-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default LoginButton;
