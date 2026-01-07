// components/trip/AddSpotForm.tsx
"use client";

import { CATEGORIES } from "./ItineraryList";

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
    <div className="mt-8 p-5 bg-slate-50 rounded-[32px] relative">
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedCategory === c.id
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-slate-400"
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
          className="h-[56px] px-4 rounded-2xl bg-white border-none outline-none font-black shadow-sm"
        />

        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddSpot()}
            placeholder="搜尋想去的景點..."
            className="w-full h-[56px] px-5 rounded-2xl bg-white outline-none font-bold shadow-sm"
          />

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[60px] bg-white border rounded-2xl shadow-2xl z-[100] overflow-hidden">
              {suggestions.map((s: any) => (
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

          {pendingLocation && (
            <div className="absolute -bottom-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-orange-500 text-white rounded-md text-[9px] font-black shadow-sm animate-bounce">
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
          className="h-[56px] bg-orange-500 text-white px-8 rounded-2xl font-black shadow-lg"
        >
          加入
        </button>
      </div>
    </div>
  );
}
