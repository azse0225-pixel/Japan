// components/trip/AddSpotForm.tsx
"use client";
import { cn } from "@/lib/utils"; // 🚀 引入 cn 工具
import { CATEGORIES } from "./constants";

interface AddSpotFormProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  suggestions: any[];
  onSelectSuggestion: (id: string, desc: string) => void;
  pendingLocation: { lat: number; lng: number } | null;
  setPendingLocation: (loc: { lat: number; lng: number } | null) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  newSpotTime: string;
  setNewSpotTime: (t: string) => void;
  onAddSpot: () => void;
}

export default function AddSpotForm({
  inputValue,
  setInputValue,
  suggestions,
  onSelectSuggestion,
  pendingLocation,
  setPendingLocation,
  selectedCategory,
  setSelectedCategory,
  newSpotTime,
  setNewSpotTime,
  onAddSpot,
}: AddSpotFormProps) {
  return (
    <div className="mt-8 p-5 bg-slate-50 rounded-[32px] relative border border-slate-100">
      {/* 1. 類別選擇 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={cn(
              "flex-1 min-w-[calc(33.33%-8px)] sm:min-w-[100px] px-4 py-2 rounded-xl text-xs font-black transition-all",
              selectedCategory === c.id
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-slate-400 border border-slate-100 hover:bg-orange-50",
            )}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* 2. 輸入區域 */}
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <input
          type="time"
          value={newSpotTime}
          onChange={(e) => setNewSpotTime(e.target.value)}
          className="h-[56px] px-4 rounded-2xl bg-white border-none outline-none font-black shadow-sm text-slate-700 shrink-0"
        />

        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)} // 🚀 關鍵：不再這裡清除座標
            onKeyDown={(e) => e.key === "Enter" && onAddSpot()}
            placeholder="搜尋地點或自訂名稱..."
            className={cn(
              "w-full h-[56px] px-5 rounded-2xl bg-white outline-none font-bold shadow-sm transition-all duration-300 border-2",
              pendingLocation
                ? "border-emerald-400 ring-4 ring-emerald-50 text-slate-800"
                : "border-transparent focus:border-orange-400 text-slate-800",
            )}
          />

          {/* ✨ Google 推薦地點選單 (僅在未鎖定座標時顯示) */}
          {suggestions.length > 0 && !pendingLocation && (
            <div className="absolute left-0 right-0 top-[60px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => onSelectSuggestion(s.place_id, s.description)}
                  className="w-full px-5 py-4 text-left hover:bg-orange-50 text-sm font-bold border-b border-slate-50 last:border-none flex items-center gap-3"
                >
                  <span className="text-orange-400">📍</span>
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onAddSpot}
          className="h-[56px] bg-orange-500 text-white px-8 rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all shrink-0"
        >
          加入
        </button>
      </div>

      {/* 🚀 3. 座標鎖定提示列 (取代原本的浮動標籤) */}
      {pendingLocation && (
        <div className="mt-3 px-4 py-2 bg-emerald-50 rounded-xl flex items-center justify-between border border-emerald-100 animate-in zoom-in-95">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
              座標已鎖定 ({pendingLocation.lat.toFixed(4)},{" "}
              {pendingLocation.lng.toFixed(4)})，可隨意修改名稱
            </p>
          </div>
          <button
            onClick={() => {
              setPendingLocation(null);
              setInputValue(""); // 清空以便重新搜尋
            }}
            className="text-[10px] font-bold text-emerald-500 hover:text-rose-500 underline decoration-2 underline-offset-2"
          >
            更換地點
          </button>
        </div>
      )}
    </div>
  );
}
