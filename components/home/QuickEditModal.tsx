"use client";

import { useState } from "react";
import { updateTripDetails, deleteTrip } from "@/lib/actions/trip-actions";
import { useRouter } from "next/navigation";

export default function QuickEditModal({
  trip,
  onClose,
}: {
  trip: any;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 狀態初始化
  const [title, setTitle] = useState(trip.title || "");
  const [location, setLocation] = useState(trip.location || "");
  const [startDate, setStartDate] = useState(trip.start_date || "");
  const [countryCode, setCountryCode] = useState(trip.country_code || "");

  const handleUpdate = async () => {
    setLoading(true);

    // 將所有欄位傳送至後端
    const result = await updateTripDetails(trip.id, {
      title,
      location,
      start_date: startDate,
      country_code: countryCode,
    });

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      alert("更新失敗: " + result.message);
    }
    setLoading(false);
  };
  const handleDelete = async () => {
    if (confirm("確定要永久刪除此行程嗎？此動作無法復原。")) {
      setLoading(true);
      const result = await deleteTrip(trip.id);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        alert("刪除失敗：" + result.message);
        setLoading(false);
      }
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-[40px] shadow-2xl animate-in zoom-in duration-200 border-4 border-orange-100">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🗓️</div>
          <h3 className="text-xl font-black text-slate-800">修改行程資訊</h3>
        </div>

        <div className="space-y-4">
          {/* 行程名稱 */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              行程名稱
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-700"
              placeholder="例如：東京五天四夜"
            />
          </div>

          {/* 地點 */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              地點
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-700"
              placeholder="例如：日本，東京"
            />
          </div>

          {/* 出發日期 */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              出發日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-700"
            />
          </div>

          {/* 搜尋區域選擇 */}
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 ml-2">
              地圖搜尋區域限制
            </label>
            <div className="relative">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-300 outline-none text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">🌎 選擇地點</option>
                <option value="TW">🇹🇼 台灣 (Taiwan)</option>
                <option value="JP">🇯🇵 日本 (Japan)</option>
                <option value="KR">🇰🇷 韓國 (Korea)</option>
                <option value="TH">🇹🇭 泰國 (Thailand)</option>
                <option value="US">🇺🇸 美國 (USA)</option>
              </select>
              {/* 自定義下拉箭頭 */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="flex-1 py-3 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "儲存中..." : "儲存修改"}
            </button>
          </div>
          <div className="pt-2 border-t border-slate-50 flex justify-center">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-bold text-red-300 hover:text-red-500 transition-colors flex items-center gap-1 p-2"
            >
              <span>🗑️</span> 刪除此行程
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
