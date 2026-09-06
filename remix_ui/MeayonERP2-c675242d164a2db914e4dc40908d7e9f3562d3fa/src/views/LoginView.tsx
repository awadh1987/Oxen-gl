import React, { useState } from 'react';
import { LandingPageView } from './LandingPageView';
import { apiService } from '../services/api';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface LoginViewProps {
	onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
	const { setCurrentUser } = useApp();
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [username, setUsername] = useState('admin@meayon.local');
	const [password, setPassword] = useState('ChangeMe123!');
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setErrorMessage('');

		try {
			const success = await apiService.login(username, password);
			if (success) {
				const currentUserProfile = await apiService.getCurrentUser();
				if (currentUserProfile) {
					setCurrentUser({
						id: currentUserProfile.id || currentUserProfile.email,
						username: currentUserProfile.username || currentUserProfile.email?.split('@')[0] || 'user',
						fullName: currentUserProfile.fullName || currentUserProfile.fullNameAr || currentUserProfile.email,
						fullNameAr: currentUserProfile.fullNameAr || currentUserProfile.fullName || currentUserProfile.email,
						email: currentUserProfile.email,
						role: (currentUserProfile.role || 'Admin') as UserRole,
						status: currentUserProfile.status || 'Active',
					});
				}
				setShowLoginModal(false);
				onLoginSuccess();
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : undefined;
			setErrorMessage(message || 'فشل تسجيل الدخول، تأكد من صحة البيانات أو تشغيل السيرفر');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="relative min-h-screen">
			<LandingPageView onLoginSuccess={() => setShowLoginModal(true)} />

			{showLoginModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold text-slate-800 dark:text-white">تسجيل الدخول للنظام</h2>
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">نظام ميون لإدارة العمليات والشحن والمالية</p>
						</div>

						<form onSubmit={handleFormSubmit} className="space-y-4" dir="rtl">
							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني / اسم المستخدم</label>
								<input type="email" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="name@meayon.com" />
							</div>

								<p className="-mt-2 text-[11px] text-slate-500 dark:text-slate-400">
									For compatibility, the app accepts both the legacy admin and the seeded backend admin.
								</p>

							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
								<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
							</div>

							{errorMessage && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">{errorMessage}</div>}

							<div className="flex gap-3 pt-2">
								<button type="submit" disabled={isLoading} className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50">{isLoading ? 'جاري التحقق...' : 'دخول النظام'}</button>
								<button type="button" onClick={() => setShowLoginModal(false)} className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all">إلغاء</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
