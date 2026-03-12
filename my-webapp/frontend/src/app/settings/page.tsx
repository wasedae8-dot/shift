'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import API_BASE from '../api';

type FacilitySetting = {
  facility_id: number;
  min_headcount: number;
  weight_leveling_low: number;
  weight_leveling_mid: number;
  weight_leveling_high: number;
  base_shift_reward: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<FacilitySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  useEffect(() => {
    const facilityId = localStorage.getItem('selected_facility_id');
    setSelectedFacilityId(facilityId);
    if (facilityId) {
      fetchSettings(facilityId);
    }
  }, []);

  const fetchSettings = async (facilityId: string) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/settings/${facilityId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        setMessage({ type: 'error', text: '保存に失敗しました' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const updateWeightPreset = (preset: 'low' | 'mid' | 'high') => {
    if (!settings) return;
    
    let weights = { low: 200, mid: 1000, high: 5000, reward: 30 };
    if (preset === 'mid') {
      weights = { low: 2000, mid: 8000, high: 25000, reward: 2 };
    } else if (preset === 'high') {
      weights = { low: 10000, mid: 50000, high: 200000, reward: 1 };
    }

    setSettings({
      ...settings,
      weight_leveling_low: weights.low,
      weight_leveling_mid: weights.mid,
      weight_leveling_high: weights.high,
      base_shift_reward: weights.reward
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div>
      </div>
    );
  }

  if (!selectedFacilityId || !settings) {
    return (
      <div className="p-8 text-center text-neutral-500">
        施設が選択されていません。施設選択画面に戻ってください。
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">基本設定</h1>
        <p className="text-neutral-500">シフト計算の基準値やAIの動作バランスを調整します。</p>
      </header>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'} animate-in fade-in slide-in-from-top-2`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-8">
        {/* Section 1: Headcount */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">必要人数の基準</h2>
              <p className="text-sm text-neutral-500">1日に最低限必要な「総出勤人数」の基本値を設定します。</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              value={settings.min_headcount}
              onChange={(e) => setSettings({ ...settings, min_headcount: parseInt(e.target.value) || 0 })}
              className="w-24 px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-lg"
            />
            <span className="text-neutral-600 font-medium">人</span>
            <p className="ml-4 text-xs text-neutral-400">※カレンダー画面の「優先日」設定はこの値を基準に自動調整されます。</p>
          </div>
        </section>

        {/* Section 2: Leveling Balance */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">人数の均一化（平準化）の強度</h2>
              <p className="text-sm text-neutral-500">日ごとの人数の偏りをどの程度厳密に排除するかを設定します。</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => updateWeightPreset('low')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${settings.weight_leveling_low <= 500 ? 'border-indigo-600 bg-indigo-50/50' : 'border-neutral-100 hover:border-neutral-200'}`}
            >
              <div className="font-bold mb-1">低（柔軟）</div>
              <div className="text-xs text-neutral-500">個人の希望を優先し、人数には多少のばらつきを許容します。</div>
            </button>
            <button 
              onClick={() => updateWeightPreset('mid')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${settings.weight_leveling_low > 500 && settings.weight_leveling_low <= 5000 ? 'border-indigo-600 bg-indigo-50/50' : 'border-neutral-100 hover:border-neutral-200'}`}
            >
              <div className="font-bold mb-1">中（標準）</div>
              <div className="text-xs text-neutral-500">標準的な設定です。人数を揃えつつ、無理のない範囲で希望を考慮します。</div>
            </button>
            <button 
              onClick={() => updateWeightPreset('high')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${settings.weight_leveling_low > 5000 ? 'border-indigo-600 bg-indigo-50/50' : 'border-neutral-100 hover:border-neutral-200'}`}
            >
              <div className="font-bold mb-1">高（厳密）</div>
              <div className="text-xs text-neutral-500">とにかく毎日同じ人数にすることを最優先します。</div>
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-dashed border-neutral-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-600">詳細パラメータ（上級者向け）</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">平準化ペナルティ (Low/Mid/High)</label>
                <div className="flex gap-2">
                  <span className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-600">{settings.weight_leveling_low}</span>
                  <span className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-600">{settings.weight_leveling_mid}</span>
                  <span className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-600">{settings.weight_leveling_high}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">出勤基本報酬（タイブレーカー）</label>
                <div className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-600 w-fit">{settings.base_shift_reward}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-indigo-900 text-white rounded-xl font-bold hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              '設定を保存する'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
