// components/trip/UnscheduledSpotsModal.tsx
"use client";

import { useState, useEffect } from "react"; // 🚀 引入 useRef
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  getUnscheduledSpots,
  moveSpotToDay,
  deleteSpot,
  addSpotToDB,
  updateSpotNote,
} from "@/lib/actions/trip-actions";

export default function UnscheduledSpotsModal({
  tripId,
  isOpen,
  onClose,
  daysCount,
  onRefresh,
}: any) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 新增狀態：記錄目前展開哪一個景點的排程按鈕
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  // 🚀 1. 新增狀態：記錄哪些景點的內容「有變更但尚未儲存」
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>(
    {},
  );
  // 🚀 2. 新增狀態：記錄儲存中的轉圈狀態
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pendingPlaceId, setPendingPlaceId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useLockBodyScroll(isOpen);
  const loadData = async () => {
    setLoading(true);
    const data = await getUnscheduledSpots(tripId);
    setList(data);
    const notesMap: Record<string, string> = {};
    data.forEach((spot: any) => {
      notesMap[spot.id] = spot.note || "";
    });
    setLocalNotes(notesMap);
    setUnsavedChanges({}); // 重新載入後清空變更狀態
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setExpandedId(null);
    }
  }, [isOpen, tripId]);
  useEffect(() => {
    if (!inputValue || inputValue.length < 2 || pendingLocation) {
      setSuggestions([]);
      return;
    }

    const autocompleteService = new google.maps.places.AutocompleteService();
    const timeoutId = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        { input: inputValue, language: "zh-TW" },
        (predictions) => setSuggestions(predictions || []),
      );
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, pendingLocation]);
  const handleNoteChange = (id: string, newNote: string) => {
    setLocalNotes((prev) => ({ ...prev, [id]: newNote }));
    // 標記為「已變更」
    setUnsavedChanges((prev) => ({ ...prev, [id]: true }));
  };
  // 🚀 4. 建立手動儲存函式
  const handleSaveNote = async (id: string) => {
    setSavingId(id);
    try {
      const noteToSave = localNotes[id] || "";
      await updateSpotNote(id, noteToSave);

      // 儲存成功後，解除「已變更」標記
      setUnsavedChanges((prev) => ({ ...prev, [id]: false }));
      console.log("備註已手動儲存成功！");
    } catch (err) {
      alert("儲存失敗，請檢查網路連線");
    } finally {
      setSavingId(null);
    }
  };
  const handleSelectSuggestion = async (
    placeId: string,
    description: string,
  ) => {
    setSuggestions([]);
    setLoading(true);
    setPendingPlaceId(placeId);
    try {
      // @ts-ignore
      const place = new google.maps.places.Place({ id: placeId });
      await place.fetchFields({ fields: ["displayName", "location"] });
      if (place.location) {
        setInputValue(place.displayName || description);
        setPendingLocation({
          lat: place.location.lat(),
          lng: place.location.lng(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddPocket = async () => {
    if (!inputValue.trim()) return;
    setIsAdding(true);
    try {
      await addSpotToDB(
        tripId,
        inputValue,
        0,
        pendingLocation?.lat || 0,
        pendingLocation?.lng || 0,
        pendingPlaceId || "",
        "spot",
        "09:00",
      );
      setInputValue("");
      setPendingLocation(null);
      setPendingPlaceId(null);
      loadData();
    } finally {
      setIsAdding(false);
    }
  };
  const handleMove = async (spotId: string, day: number) => {
    try {
      const currentNote = localNotes[spotId] || "";
      await moveSpotToDay(spotId, day, tripId, currentNote);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("移動失敗");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 bg-amber-500 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black italic">Pocket List.</h3>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">
              行程收集箱
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* 搜尋區 */}
        <div className="p-5 bg-amber-50/50 border-b border-amber-100 relative shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                }}
                placeholder="搜尋想去的景點..."
                className={cn(
                  "w-full px-5 py-3 rounded-2xl border-2 bg-white shadow-sm outline-none font-bold text-sm transition-all text-slate-900",
                  pendingLocation
                    ? "border-emerald-400 ring-2 ring-emerald-50"
                    : "border-white focus:border-amber-400",
                )}
              />
              {pendingLocation && (
                <div className="mt-2 ml-2 flex items-center justify-between animate-in fade-in slide-in-from-left-2">
                  <p className="text-[10px] font-black text-emerald-500 flex items-center gap-1">
                    📍座標已鎖定，你可以隨意自訂顯示名稱
                  </p>
                  <button
                    onClick={() => {
                      // 🚀 重設所有狀態，讓使用者可以重新搜尋
                      setPendingLocation(null);
                      setPendingPlaceId(null);
                      setInputValue("");
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 underline"
                  >
                    更換地點
                  </button>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() =>
                        handleSelectSuggestion(s.place_id, s.description)
                      }
                      className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-amber-50 border-b border-slate-50 last:border-none"
                    >
                      📍 {s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAddPocket}
              disabled={isAdding || !inputValue}
              className="bg-amber-500 text-white px-5 rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 disabled:opacity-50"
            >
              {isAdding ? "..." : "加入"}
            </button>
          </div>
        </div>

        {/* 口袋列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading && list.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold animate-pulse text-sm">
              整理中...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[35px] border-2 border-dashed border-slate-100">
              <p className="text-slate-400 font-black text-sm italic">
                清單空空如也
              </p>
            </div>
          ) : (
            // components/trip/UnscheduledSpotsModal.tsx 內部的列表渲染部分

            list.map((spot) => (
              <div
                key={spot.id}
                className={cn(
                  "p-5 rounded-[30px] border transition-all duration-300 flex flex-col",
                  expandedId === spot.id
                    ? "bg-white border-amber-200 shadow-xl shadow-amber-100/50"
                    : "bg-slate-50 border-slate-100 hover:bg-slate-100",
                )}
              >
                {/* 標題與動作區：點擊整區塊即可展開 */}
                <div className="flex items-center gap-3">
                  {/* 🚀 左側旋轉箭頭 */}
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === spot.id ? null : spot.id)
                    }
                    className="shrink-0 group/arrow"
                  >
                    <svg
                      className={cn(
                        "w-5 h-5 text-slate-300 transition-transform duration-300",
                        expandedId === spot.id
                          ? "rotate-90 text-amber-500"
                          : "rotate-0",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* 標題資訊：點擊也可展開 */}
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onClick={() =>
                      setExpandedId(expandedId === spot.id ? null : spot.id)
                    }
                  >
                    <h4 className="font-black text-slate-700 text-base leading-tight">
                      {spot.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {spot.lat !== 0 ? "📍 已標記座標" : "📝 純文字備忘"}
                    </p>
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={() => deleteSpot(tripId, spot.id).then(loadData)}
                    className="text-slate-200 hover:text-rose-500 p-1 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* 🚀 展開後的 Day 按鈕區域 */}
                {expandedId === spot.id && (
                  <div className="mt-5 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-3">
                    {/* 📝 備註輸入框 */}
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">
                          行前筆記
                        </label>

                        {/* 🚀 5. 根據狀態切換按鈕 */}
                        {unsavedChanges[spot.id] ? (
                          <button
                            onClick={() => handleSaveNote(spot.id)}
                            disabled={savingId === spot.id}
                            className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-lg shadow-lg shadow-amber-200 animate-bounce transition-all active:scale-90"
                          >
                            {savingId === spot.id
                              ? "儲存中..."
                              : "💾 點擊儲存變更"}
                          </button>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-400 italic uppercase flex items-center gap-1">
                            ✓ 已與雲端同步
                          </span>
                        )}
                      </div>
                      <textarea
                        value={localNotes[spot.id] || ""}
                        onChange={(e) =>
                          handleNoteChange(spot.id, e.target.value)
                        }
                        placeholder="備註...(例如: 需預約、必吃項目)"
                        rows={2}
                        className="w-full p-4 rounded-2xl bg-amber-50/40 border border-amber-100 text-xs font-bold text-slate-600 outline-none focus:bg-amber-50 focus:border-amber-300 transition-all placeholder:text-slate-200 resize-none"
                      />
                    </div>

                    {/* 安排天數按鈕 */}
                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">
                      安排至行程 Day：
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: daysCount }, (_, i) => i + 1).map(
                        (d) => (
                          <button
                            key={d}
                            onClick={() => handleMove(spot.id, d)}
                            className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-black text-slate-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                          >
                            D{d}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
