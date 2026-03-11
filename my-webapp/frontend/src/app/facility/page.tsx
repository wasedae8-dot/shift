"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FacilitySelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const password = localStorage.getItem('app_password');
    if (!password) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [router]);

  const handleSelect = (id: number) => {
    localStorage.setItem('selected_facility_id', id.toString());
    window.dispatchEvent(new Event('facilityChange'));
    router.push('/staff'); // 施設選択後はスタッフ管理へ
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">事業所を選択してください</h1>
          <p className="text-neutral-500">管理する施設を選択して、業務を開始します。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => handleSelect(1)}
            className="group relative bg-white border-2 border-neutral-100 p-8 rounded-3xl hover:border-indigo-500 hover:ring-4 hover:ring-indigo-50/50 transition-all text-left overflow-hidden"
          >
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <span className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">サンケア上池台</h2>
              <p className="text-sm text-neutral-500">Ueikedai Facility</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect(2)}
            className="group relative bg-white border-2 border-neutral-100 p-8 rounded-3xl hover:border-emerald-500 hover:ring-4 hover:ring-emerald-50/50 transition-all text-left overflow-hidden"
          >
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <span className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">サンケア鵜の木</h2>
              <p className="text-sm text-neutral-500">Unoki Facility</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
