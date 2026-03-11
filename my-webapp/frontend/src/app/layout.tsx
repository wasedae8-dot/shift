'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import API_BASE from './api';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyStoredPassword = async () => {
      const password = localStorage.getItem('app_password');
      const facilityId = localStorage.getItem('selected_facility_id');
      setSelectedFacilityId(facilityId);

      if (!password) {
        if (pathname !== '/login') {
          setIsAuthenticated(false);
          router.push('/login');
        } else {
          setIsAuthenticated(false);
        }
        return;
      }

      // If password exists, check facility selection
      if (!facilityId && pathname !== '/facility' && pathname !== '/login') {
        router.push('/facility');
        return;
      }

      // If on login page with a password, or any other page, verify it
      try {
        const response = await fetch(`${API_BASE}/api/auth/verify`, {
          headers: { 'X-App-Password': password }
        });
        if (response.ok) {
          setIsAuthenticated(true);
          if (pathname === '/login') {
             // After login, if no facility selected, go to select, otherwise go home
             if (!facilityId) router.push('/facility');
             else router.push('/');
          }
        } else {
          localStorage.removeItem('app_password');
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        if (isAuthenticated === null) {
          setIsAuthenticated(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      }
    };

    verifyStoredPassword();
    
    // Listen for storage changes in other tabs or same tab manual triggers
    const handleStorage = () => {
        const fid = localStorage.getItem('selected_facility_id');
        setSelectedFacilityId(fid);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('facilityChange', handleStorage as any);
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('facilityChange', handleStorage as any);
    };
  }, [pathname, router, isAuthenticated]);


  // Don't show anything until we've checked authentication
  if (isAuthenticated === null && pathname !== '/login') {
    return (
      <html lang="ja">
        <body className="bg-neutral-50 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div>
        </body>
      </html>
    );
  }

  const isLoginPage = pathname === '/login';

  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-neutral-50 text-neutral-900">
        {isLoginPage ? (
          <main className="min-h-screen">
            {children}
          </main>
        ) : isAuthenticated ? (
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-indigo-900 text-white min-h-screen flex flex-col pt-8">
              <h1 className="text-xl font-bold px-6 mb-2 tracking-wider">シフト自動作成システム</h1>
              
              {/* Current Facility Display */}
              <div className="px-6 mb-8">
                <div className="bg-indigo-800/50 p-3 rounded-xl border border-indigo-700/50">
                   <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold mb-1">現在の管理施設</div>
                   <div className="text-sm font-medium flex items-center justify-between">
                     <span>{selectedFacilityId === '1' ? 'サンケア上池台' : selectedFacilityId === '2' ? 'サンケア鵜の木' : '未選択'}</span>
                     <Link href="/facility" className="text-[10px] px-2 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-indigo-100 transition-colors">変更</Link>
                   </div>
                </div>
              </div>

              <nav className="flex-1 flex flex-col gap-1 px-4">
                <Link href="/" className={`${pathname === '/' ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-800'} px-4 py-3 rounded-lg transition-all flex items-center gap-3`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm font-medium">カレンダー</span>
                </Link>
                <Link href="/staff" className={`${pathname === '/staff' ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-800'} px-4 py-3 rounded-lg transition-all flex items-center gap-3`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  <span className="text-sm font-medium">スタッフ管理</span>
                </Link>
                <Link href="/requests" className={`${pathname === '/requests' ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-800'} px-4 py-3 rounded-lg transition-all flex items-center gap-3`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span className="text-sm font-medium">希望休入力</span>
                </Link>
                
                <div className="mt-auto pt-4 border-t border-indigo-800/50 flex flex-col gap-1">
                  <Link href="/settings" className="px-4 py-3 text-indigo-300 hover:bg-indigo-800 hover:text-white rounded-lg transition-all flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-sm font-medium">基本設定</span>
                  </Link>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('app_password');
                      localStorage.removeItem('selected_facility_id');
                      router.push('/login');
                    }}
                    className="px-4 py-3 text-red-400 hover:bg-red-900/30 rounded-lg transition-all flex items-center gap-3 mb-8"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="text-sm font-medium">ログアウト</span>
                  </button>
                </div>
              </nav>
            </aside>
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full">
              {children}
            </main>
          </div>
        ) : (
          /* Show loading spinner while redirecting if not authenticated and not on login page */
          <div className="flex items-center justify-center min-h-screen bg-neutral-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div>
          </div>
        )}
      </body>
    </html>
  );
}
