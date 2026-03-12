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

  const handleReset = () => {
    if (!settings) return;
    if (!confirm('詳細パラメータを標準の初期値に戻しますか？')) return;
    
    // Standard defaults (Mid preset values)
    setSettings({
      ...settings,
      weight_leveling_low: 2000,
      weight_leveling_mid: 8000,
      weight_leveling_high: 25000,
      base_shift_reward: 2
    });
    setMessage({ type: 'success', text: '標準値にリセットしました（保存ボタンを押すと確定します）' });
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

          <div className="space-y-6 pt-6 border-t border-dashed border-neutral-100">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-neutral-700">詳細パラメータ（上級者向け）</h3>
                <button 
                  onClick={handleReset}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.233 8.5M21 9v1m-2-2v2" /></svg>
                  初期値に戻す
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">平準化ペナルティの設定</label>
                  <p className="text-[11px] text-neutral-400 mb-2">数値が大きいほど、人数の偏りに対してAIが厳しく反応します。</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-600">低度な偏り (±1人)</span>
                      <input 
                        type="number"
                        value={settings.weight_leveling_low}
                        onChange={(e) => setSettings({ ...settings, weight_leveling_low: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-neutral-200 rounded text-right text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-600">中度な偏り (±2人)</span>
                      <input 
                        type="number"
                        value={settings.weight_leveling_mid}
                        onChange={(e) => setSettings({ ...settings, weight_leveling_mid: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-neutral-200 rounded text-right text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-600">高度な偏り (±3人以上)</span>
                      <input 
                        type="number"
                        value={settings.weight_leveling_high}
                        onChange={(e) => setSettings({ ...settings, weight_leveling_high: parseInt(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-neutral-200 rounded text-right text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">出勤基本報酬</label>
                  <p className="text-[11px] text-neutral-400 mb-2">出勤1回あたりの「加点」です。小さいほどバランス（平準化）が優先されます。</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-neutral-600">タイブレーカー値</span>
                    <input 
                      type="number"
                      value={settings.base_shift_reward}
                      onChange={(e) => setSettings({ ...settings, base_shift_reward: parseInt(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 border border-neutral-200 rounded text-right text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      💡 **ヒント**: 人数がバラバラになる場合はこの値を **1〜2** に下げ、逆に人が足りなくなる場合は **30以上** に上げてください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/* Section 3: Algorithm Guide */}
        <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-neutral-900">AIアルゴリズムの解説</h2>
          </div>
          
          <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-indigo-900 mb-1">1. 目標人数の自動決定</h4>
              <p>AIはまず、全スタッフの「契約上の出勤日数」を合計し、それを営業日数で割って**日次の平均人数（ターゲット）**を算出します。この値を基準に、多すぎず少なすぎない配置を目指します。</p>
            </div>

            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-indigo-900 mb-1">2. 強力な制約（ハード制約）</h4>
              <p>「休み希望（希望休・有休・夏休）」は**絶対的なルール**として扱われます。どれだけ人数が不足していても、AIが勝手に休み希望を無視してシフトを入れることはありません。</p>
            </div>

            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-indigo-900 mb-1">3. 重み付けとバランス調整</h4>
              <p>「平準化ペナルティ」は、目標人数から±1人、±2人と外れるごとにAIが感じる**「不快感（マイナス点）」**の大きさです。この値を大きくすると、AIは個人の連勤数などを犠牲にしてでも、人数を揃えることを優先します。</p>
            </div>

            <div className="bg-white/60 p-4 rounded-xl">
              <h4 className="font-bold text-indigo-900 mb-1">4. 出勤基本報酬の役割</h4>
              <p>これは1回の出勤ごとにAIがもらえる**「ご褒美（プラス点）」**です。この値が高いと、AIは積極的に人を配置しようとします。逆に低く設定すると、無駄な出勤を減らし、平準化（均一化）を優先するようになります。</p>
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
