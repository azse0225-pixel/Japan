//components/home/AddTripModal.tsx

"use client";

import { useState } from "react";
import { createNewTrip } from "@/lib/actions/trip-actions";
import { useRouter } from "next/navigation";

export default function AddTripModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode) return alert("請選擇地圖搜尋區域限制！");
    setLoading(true);

    const data = {
      title,
      date: startDate,
      location,
      country_code: countryCode,
    };

    try {
      const result = await createNewTrip(data);

      if (result.success && result.id) {
        // ✨✨✨ 關鍵：這段絕對不能漏掉 ✨✨✨
        // 1. 先抓出舊的清單
        const oldTrips = JSON.parse(localStorage.getItem("my_trips") || "[]");

        // 2. 把新的 ID 塞進去 (去重檢查)
        if (!oldTrips.includes(result.id)) {
          const newTrips = [...oldTrips, result.id];
          // 3. 存回口袋
          localStorage.setItem("my_trips", JSON.stringify(newTrips));
        }

        // 標記我是創辦人
        localStorage.setItem(`owner_of_${result.id}`, "true");

        console.log("✅ 成功存入口袋:", result.id);
        // ✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨

        onClose();
        // 直接跳轉到行程頁面
        router.push(`/trip/${result.id}`);
        // 強制刷新首頁狀態
        router.refresh();
      } else {
        alert("建立失敗: " + (result.message || "未知錯誤"));
      }
    } catch (err) {
      console.error("建立過程出錯:", err);
      alert("系統錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-[40px] shadow-2xl animate-in zoom-in duration-200 border-4 border-orange-100">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🗓️</div>
          <h3 className="text-xl font-black text-slate-800">新增行程資訊</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              行程名稱
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-900 placeholder:text-slate-300"
              placeholder="例如：日本櫻花祭"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              地點
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-900 placeholder:text-slate-300"
              placeholder="例如：日本，東京"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              出發日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              區域限制
            </label>
            <div className="relative">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                required
                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">🌎 選擇區域</option>
                <option value="TW">🇹🇼 台灣</option>
                <option value="JP">🇯🇵 日本</option>
                <option value="KR">🇰🇷 韓國</option>
                <option value="TH">🇹🇭 泰國</option>
                <option value="US">🇺🇸 美國</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-xs">
                ▼
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "建立中..." : "開始冒險"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
