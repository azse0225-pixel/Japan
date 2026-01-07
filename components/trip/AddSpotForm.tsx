// components/trip/AddSpotForm.tsx
"use client";
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
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`flex-1 min-w-[calc(33.33%-8px)] sm:min-w-[100px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedCategory === c.id
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-slate-400 border border-slate-100"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <input
          type="time"
          value={newSpotTime}
          onChange={(e) => setNewSpotTime(e.target.value)}
          className="h-[56px] px-4 rounded-2xl bg-white border-none outline-none font-black shadow-sm text-slate-700"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddSpot()}
            placeholder="搜尋想去的景點..."
            className="w-full h-[56px] px-5 rounded-2xl bg-white outline-none font-bold shadow-sm text-slate-800"
          />

          {/* ✨ Google 推薦地點選單 */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[60px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden">
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

          {/* ✨ 浮動座標標籤 */}
          {pendingLocation && (
            <div className="absolute -bottom-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-orange-600 text-white rounded-md text-[10px] font-black shadow-lg animate-bounce">
              📍 座標鎖定: {pendingLocation.lat.toFixed(4)},{" "}
              {pendingLocation.lng.toFixed(4)}
              <button
                onClick={() => setPendingLocation(null)}
                className="ml-1 hover:text-orange-200"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onAddSpot}
          className="h-[56px] bg-orange-500 text-white px-8 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          加入
        </button>
      </div>
    </div>
  );
}
