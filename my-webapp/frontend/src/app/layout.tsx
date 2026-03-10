'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyStoredPassword = async () => {
      const password = localStorage.getItem('app_password');
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

      if (!password) {
        if (pathname !== '/login') {
          setIsAuthenticated(false);
          router.push('/login');
        } else {
          setIsAuthenticated(false);
        }
        return;
      }

      // If on login page with a password, or any other page, verify it
      try {
        const response = await fetch(`${API_BASE}/api/auth/verify`, {
          headers: { 'X-App-Password': password }
        });
        if (response.ok) {
          setIsAuthenticated(true);
          if (pathname === '/login') router.push('/');
        } else {
          localStorage.removeItem('app_password');
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        // If we can't reach the backend, we can't verify. 
        // If we are already authenticated, keep it, otherwise redirect to login with error
        if (isAuthenticated === null) {
          // First load and can't reach backend. If not localhost, it's a real issue.
          if (!API_BASE.includes('localhost')) {
             // setError or handle accordingly. For now, let them stay on the state 
             // but maybe they are stuck. Let's just set true if we can't check? 
             // No, security first.
          }
        }
      }
    };

    verifyStoredPassword();
  }, [pathname, router]);


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
              <h1 className="text-xl font-bold px-6 mb-8 tracking-wider">シフト自動作成システム</h1>
              <nav className="flex-1 flex flex-col gap-2 px-4">
                <Link href="/" className="px-4 py-3 rounded-md hover:bg-indigo-800 transition-colors flex items-center gap-3">
                  <span className="text-lg">カレンダー</span>
                </Link>
                <Link href="/staff" className="px-4 py-3 rounded-md hover:bg-indigo-800 transition-colors flex items-center gap-3">
                  <span className="text-lg">スタッフ管理</span>
                </Link>
                <Link href="/requests" className="px-4 py-3 rounded-md hover:bg-indigo-800 transition-colors flex items-center gap-3">
                  <span className="text-lg">希望休入力</span>
                </Link>
                <Link href="/settings" className="px-4 py-3 rounded-md hover:bg-indigo-800 transition-colors flex items-center gap-3 mt-auto mb-8">
                  <span className="text-lg">基本設定</span>
                </Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('app_password');
                    router.push('/login');
                  }}
                  className="px-4 py-3 rounded-md hover:bg-red-800 transition-colors flex items-center gap-3 text-red-200 mt-2 border-t border-indigo-800"
                >
                  <span className="text-lg">ログアウト</span>
                </button>
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

