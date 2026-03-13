"use client";

import { useState } from "react";
import { X, AlertCircle, ShieldCheck, MapPin, Calendar, Clock, CheckCircle2, DollarSign, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  onSuccess: () => void;
}

export default function ReportModal({ isOpen, onClose, targetId, onSuccess }: ReportModalProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("fraud");
  const [rating, setRating] = useState(1);
  const [actuallyMet, setActuallyMet] = useState(true);
  const [occurredAt, setOccurredAt] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [amountAgreed, setAmountAgreed] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isIdVerified, setIsIdVerified] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;

    setLoading(true);
    setError("");

    try {
      const lookupRes = await fetch(`http://localhost:8001/search?identifier=${encodeURIComponent(targetId)}`);
      if (!lookupRes.ok) throw new Error("対象の照会に失敗しました");
      const subject = await lookupRes.json();

      const res = await fetch("http://localhost:8001/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subject.id,
          content,
          category,
          rating: Number(rating),
          actually_met: actuallyMet,
          occurred_at: occurredAt || null,
          location: location || null,
          meeting_duration: duration || null,
          amount_agreed: amountAgreed ? Number(amountAgreed) : null,
          amount_paid: amountPaid ? Number(amountPaid) : null,
          is_id_verified: isIdVerified,
          evidence_url: ""
        }),
      });

      if (!res.ok) throw new Error("送信に失敗しました");
      
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSubmitted(false);
        resetForm();
      }, 2000);
    } catch (err) {
      setError("レポートの送信中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setCategory("fraud");
    setRating(1);
    setActuallyMet(true);
    setOccurredAt("");
    setLocation("");
    setDuration("");
    setAmountAgreed("");
    setAmountPaid("");
    setIsIdVerified(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {submitted ? (
          <div className="p-12 text-center my-auto">
            <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">レポート送信完了</h3>
            <p className="text-gray-400 text-lg">貴重な情報提供ありがとうございます。<br />あなたの報告が、誰かの被害を未然に防ぎます。</p>
          </div>
        ) : (
          <>
            <div className="px-8 pt-8 pb-4 flex justify-between items-start sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5">
              <div>
                <h3 className="text-2xl font-black mb-1 tracking-tighter">被害レポートの作成</h3>
                <p className="text-gray-500 text-sm flex items-center gap-2">対象: <span className="text-rose-400 font-mono font-bold px-2 py-0.5 bg-rose-400/10 rounded-md">{targetId}</span></p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
              {error && (
                <div className="p-4 rounded-2xl bg-orange-900/20 border border-orange-500/30 text-orange-400 text-sm flex gap-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Basic Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">被害カテゴリ</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all appearance-none"
                  >
                    <option value="fraud">お手当て不履行・詐欺（未払い含む）</option>
                    <option value="no-show">ドタキャン / 当日ブロック</option>
                    <option value="bad-manner">マナー違反 / 大人トラブル / 強引な行為</option>
                    <option value="scammer">業者 / サクラ / 晒し / 通報厨</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">要注意レベル (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRating(val)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold transition-all border",
                          rating === val 
                            ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
                            : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} /> 発生時期
                  </label>
                  <input 
                    type="text" 
                    placeholder="例: 2024年4月"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} /> 場所（地区）
                  </label>
                  <input 
                    type="text" 
                    placeholder="例: 新宿、梅田"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> 一緒にいた時間
                  </label>
                  <input 
                    type="text" 
                    placeholder="例: 1時間、食事のみ"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">対面ステータス</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setActuallyMet(true)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border",
                        actuallyMet ? "bg-white text-black border-white" : "bg-transparent border-white/10 text-gray-500"
                      )}
                    >
                      <CheckCircle2 size={16} /> 実際に会えた
                    </button>
                    <button
                      type="button"
                      onClick={() => setActuallyMet(false)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border",
                        !actuallyMet ? "bg-white text-black border-white" : "bg-transparent border-white/10 text-gray-500"
                      )}
                    >
                      <X size={16} /> 会えなかった
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">身分証の提示</label>
                  <button
                    type="button"
                    onClick={() => setIsIdVerified(!isIdVerified)}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border",
                      isIdVerified ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent border-white/10 text-gray-500"
                    )}
                  >
                    <Fingerprint size={16} /> {isIdVerified ? "相手の身分証を確認済み" : "身分証は未確認"}
                  </button>
                </div>
              </div>

              {/* Money Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={14} /> 提示されたお手当て (円)
                  </label>
                  <input 
                    type="number" 
                    placeholder="例: 30000"
                    value={amountAgreed}
                    onChange={(e) => setAmountAgreed(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={14} /> 実際のお手当て (円)
                  </label>
                  <input 
                    type="number" 
                    placeholder="例: 10000"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-rose-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Content area */}
              <div>
                <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">被害詳細・備考</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="具体的な言動、トラブルの経緯などを詳しく記載してください。客観的な情報は、他のユーザーにとって大きな助けになります。"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 outline-none focus:border-rose-500/50 transition-all resize-none min-h-[120px]"
                />
              </div>

              <div className="sticky bottom-0 bg-[#0a0a0a] pt-4 pb-0 z-10">
                <button
                  type="submit"
                  disabled={loading || !content}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-2xl transition-all disabled:opacity-50 text-lg shadow-[0_10px_40px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? "送信中..." : "匿名でこの相手をデータベースに記録する"}
                </button>
                <p className="text-[10px] text-gray-600 text-center mt-4 pb-4">
                  ※虚偽の報告や誹謗中傷は法的措置の対象となる場合があります。事実にのみ基づいた記載をお願いします。
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
