'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import API_BASE from '../api';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check if auth is required on mount
  useState(() => {
    const checkAuthRequirement = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify`);
        if (res.ok) {
          const data = await res.json();
          if (data.auth_required === false) {
            console.log('DEBUG: Auth not required, redirecting...');
            const returnTo = sessionStorage.getItem('return_to');
            sessionStorage.removeItem('return_to');
            router.push(returnTo || '/');
          }
        }
      } catch (e) {
        console.warn('Auth check failed:', e);
      }
    };
    checkAuthRequirement();
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          'X-App-Password': password
        }
      });

      if (response.ok) {
        localStorage.setItem('app_password', password);
        const returnTo = sessionStorage.getItem('return_to');
        sessionStorage.removeItem('return_to');
        router.push(returnTo || '/');
      } else {
        setError('パスワードが正しくありません');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };







  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-900 mb-2">シフト管理システム</h1>
          <p className="text-neutral-600 italic">セキュリティのためパスワードを入力してください</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md active:scale-[0.98]"
          >
            ログイン
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-400">
            Powered by Shift Scheduling AI
          </p>
        </div>
      </div>
    </div>
  );
}
