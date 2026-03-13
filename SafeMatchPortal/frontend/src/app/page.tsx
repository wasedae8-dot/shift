"use client";

import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck, MessageSquare, AlertTriangle, ExternalLink, MapPin, Calendar, DollarSign, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportModal from "@/components/ReportModal";

interface Review {
  id: number;
  content: string;
  category: string;
  rating: number;
  actually_met: boolean;
  occurred_at?: string;
  location?: string;
  meeting_duration?: string;
  amount_agreed?: number;
  amount_paid?: number;
  is_id_verified: boolean;
  evidence_url?: string;
  created_at: string;
}

interface Subject {
  id: number;
  identifier: string;
  type: string;
  name?: string;
  description?: string;
  trust_score: number;
  reviews: Review[];
}

export default function Home() {
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const target = typeof e === 'string' ? e : searchId;
    if (!target) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const cleanId = target.startsWith("@") ? target : `@${target}`;
      const res = await fetch(`http://localhost:8001/search?identifier=${encodeURIComponent(cleanId)}`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("サーバーとの通信に失敗しました。バックエンドが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "fraud": return "お手当て不履行・詐欺";
      case "no-show": return "ドタキャン・当日連絡なし";
      case "harassment": return "迷惑行為";
      case "bad-manner": return "マナー違反・法的リスク";
      case "scammer": return "業者・サクラ・晒し";
      case "good": return "良質・優良パパ";
      default: return "その他";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "fraud": return "text-red-400 border-red-900/50 bg-red-900/20";
      case "no-show": return "text-orange-400 border-orange-900/50 bg-orange-900/20";
      case "harassment": return "text-yellow-400 border-yellow-900/50 bg-yellow-900/20";
      case "bad-manner": return "text-purple-400 border-purple-900/50 bg-purple-900/20";
      case "scammer": return "text-rose-400 border-rose-900/50 bg-rose-900/20";
      case "good": return "text-green-400 border-green-900/50 bg-green-900/20";
      default: return "text-gray-400 border-gray-900/50 bg-gray-900/20";
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] selection:bg-rose-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-16 px-6 sm:px-12 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-rose-500/10 blur-[120px] rounded-full -z-10" />
        
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-medium">
            <ShieldAlert size={14} />
            <span>匿名リスク管理ポータル</span>
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          Safe-Match Portal
        </h1>
        
        <p className="max-w-2xl mx-auto text-gray-400 text-lg sm:text-xl mb-12">
          その出会い、本当に大丈夫？<br />
          X (Twitter) の ID や電話番号から、過去のトラブル履歴を瞬時に検索。
        </p>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-purple-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 -z-10" />
            <input
              type="text"
              placeholder="例: @user_id または 電話番号"
              className="w-full bg-[#111] border border-white/10 rounded-2xl py-5 px-14 text-xl outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all shadow-2xl"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "判定中..." : "判定"}
            </button>
          </form>
          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
        </div>
      </div>

      {/* Results Section */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Subject Info Card */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    {result.identifier}
                    {result.trust_score < -2 ? (
                       <ShieldAlert className="text-red-500" size={32} />
                    ) : result.trust_score > 2 ? (
                      <ShieldCheck className="text-green-500" size={32} />
                    ) : (
                      <ShieldAlert className="text-gray-500" size={32} />
                    )}
                  </h2>
                  <p className="text-gray-500">
                    判定: {result.trust_score < -2 ? (
                      <span className="text-red-400 font-bold underline">要警戒</span>
                    ) : result.reviews.length === 0 ? (
                      <span className="text-gray-400">実績なし（クリーン）</span>
                    ) : (
                      <span className="text-yellow-400 font-bold">要注意</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs uppercase tracking-widest text-gray-500 mb-1">口コミ総数</span>
                  <span className="text-3xl font-mono font-bold text-white">{result.reviews.length} 件</span>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> 直近のレポート
                </h3>
                
                {result.reviews.length === 0 ? (
                  <div className="py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-gray-500">このIDに関するトラブル報告はまだありません。</p>
                  </div>
                ) : (
                  result.reviews.map((review) => (
                    <div key={review.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold border",
                          getCategoryColor(review.category)
                        )}>
                          {getCategoryLabel(review.category)}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Meeting Details Chips */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {review.location && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400">
                            <MapPin size={10} /> {review.location}
                          </div>
                        )}
                        {review.occurred_at && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400">
                            <Calendar size={10} /> {review.occurred_at}
                          </div>
                        )}
                        {review.is_id_verified && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-400">
                            <Fingerprint size={10} /> 身分証確認済
                          </div>
                        )}
                        {review.amount_paid !== null && review.amount_agreed !== null && (
                          <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold",
                            (review.amount_paid ?? 0) < (review.amount_agreed ?? 0) 
                              ? "bg-red-500/10 border-red-500/30 text-red-400" 
                              : "bg-green-500/10 border-green-500/30 text-green-400"
                          )}>
                            <DollarSign size={10} /> 
                            お手当て: {review.amount_paid?.toLocaleString()}円 
                            {(review.amount_paid ?? 0) < (review.amount_agreed ?? 0) && (
                              <span className="opacity-60 ml-1 line-through">({review.amount_agreed?.toLocaleString()}円)</span>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-gray-300 leading-relaxed mb-4">
                        {review.content}
                      </p>
                      {review.evidence_url && (
                        <a 
                          href={review.evidence_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-rose-400 flex items-center gap-1 hover:underline"
                        >
                          証拠を確認（外部サイト） <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CTA: Report Button */}
            <div className="bg-gradient-to-r from-rose-900/20 to-purple-900/20 border border-rose-500/30 rounded-3xl p-8 text-center">
              <h3 className="text-xl font-bold mb-2">あなたの体験を共有してください</h3>
              <p className="text-gray-400 text-sm mb-6">被害を未然に防ぐために、匿名での報告をお待ちしています。</p>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="bg-white text-black font-bold py-3 px-8 rounded-xl hover:bg-gray-200 transition-colors"
              >
                匿名で報告する
              </button>
            </div>
          </div>
        )}
      </section>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        targetId={result?.identifier || ""} 
        onSuccess={() => handleSearch(result?.identifier || "")} 
      />

      {/* Footer / Empty State */}
      {!result && (
        <footer className="max-w-4xl mx-auto px-6 pb-12 mt-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 border-t border-white/5">
             <div className="space-y-3">
              <AlertTriangle className="text-rose-500" />
               <h4 className="font-bold">情報の真実性</h4>
               <p className="text-xs text-gray-500">収集された情報は100%の真実を保証するものではありません。あくまで取引のリスクを回避するための参考指標としてご利用ください。</p>
             </div>
             <div className="space-y-3">
              <ShieldCheck className="text-purple-500" />
               <h4 className="font-bold">匿名性の保護</h4>
               <p className="text-xs text-gray-500">投稿者は完全に匿名化されます。あなたのプライバシーを守りながら、安全なコミュニティ活動を支援します。</p>
             </div>
             <div className="space-y-3">
              <MessageSquare className="text-blue-500" />
               <h4 className="font-bold">運営への連絡</h4>
               <p className="text-xs text-gray-500">名誉毀損や不適切な投稿の削除依頼につきましては、専用フォームよりお問い合わせください。</p>
             </div>
          </div>
        </footer>
      )}
    </main>
  );
}
