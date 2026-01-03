"use client";

import { useState, useEffect } from "react";
import {
  getChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/lib/actions/trip-actions";

export default function ChecklistModal({ tripId, isOpen, onClose }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  // 初始化載入
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getChecklist(tripId).then((data) => {
        setItems(data);
        setLoading(false);
      });

      // ✨ 修正跑版重點：鎖定背景滾動
      document.body.style.overflow = "hidden";
    } else {
      // 關閉時恢復滾動
      document.body.style.overflow = "unset";
    }

    // 組件卸載時清理，防止鎖死
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, tripId]);

  // 新增項目
  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const tempId = Math.random().toString();
    const optimisticItem = { id: tempId, content: newItem, is_checked: false };
    setItems([...items, optimisticItem]);
    setNewItem("");
    await addChecklistItem(tripId, newItem);
    const data = await getChecklist(tripId);
    setItems(data);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, is_checked: !currentStatus } : i))
    );
    await toggleChecklistItem(id, !currentStatus);
  };

  const handleDelete = async (id: string) => {
    setItems(items.filter((i) => i.id !== id));
    await deleteChecklistItem(id);
  };

  if (!isOpen) return null;

  return (
    // ✨ 手機版優化：
    // 1. items-end (手機靠下) sm:items-center (電腦置中)
    // 2. p-0 (手機無邊距) sm:p-4
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-bottom">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 視窗本體 */}
      {/* ✨ 手機版優化重點：
         1. rounded-t-[32px] (手機只有上面圓角) sm:rounded-[32px] (電腦全圓角)
         2. animate-in slide-in-from-bottom (由下往上滑入動畫)
         3. max-h-[85vh] (給手機鍵盤多一點空間)
      */}
      <div className="relative bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 border-t-4 sm:border-4 border-white">
        {/* 手機版把手 (Visual Handle) */}
        <div
          className="sm:hidden w-full flex justify-center pt-3 pb-1"
          onClick={onClose}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* 標題區 */}
        <div className="p-6 pb-2 sm:border-b border-slate-100 flex justify-between items-center bg-white sm:bg-orange-50 sm:rounded-t-[28px]">
          <h3 className="text-xl font-black text-orange-900 flex items-center gap-2">
            🎒 行前檢查清單
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 sm:bg-white text-slate-400 sm:text-orange-400 rounded-full font-bold shadow-sm hover:bg-orange-100 transition-all"
          >
            ✕
          </button>
        </div>

        {/* 列表內容區 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
          {loading ? (
            <div className="text-center py-10 text-slate-400">載入中...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-slate-300 font-bold">
              還沒有項目，快把護照加進來！
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${
                  item.is_checked
                    ? "bg-slate-50"
                    : "bg-white hover:bg-orange-50/50 border border-transparent hover:border-orange-100"
                }`}
              >
                <button
                  onClick={() => handleToggle(item.id, item.is_checked)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    item.is_checked
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-slate-300 hover:border-orange-400"
                  }`}
                >
                  {item.is_checked && "✓"}
                </button>
                <span
                  className={`flex-1 font-bold text-sm transition-all ${
                    item.is_checked
                      ? "text-slate-400 line-through decoration-2"
                      : "text-slate-700"
                  }`}
                >
                  {item.content}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* 輸入區 */}
        {/* ✨ 手機版優化：pb-8 (避開 iPhone 底部橫條) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 pb-8 sm:pb-4 rounded-b-none sm:rounded-b-[28px]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="新增項目 (例如: 買網卡)..."
              // text-base 防止 iOS 自動放大頁面
              className="flex-1 px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-300 font-bold text-sm text-base"
              autoFocus={!/Mobi|Android/i.test(navigator.userAgent)} // 手機版不自動 focus，避免鍵盤一打開就跳出來擋住畫面
            />
            <button
              onClick={handleAdd}
              className="bg-orange-500 text-white px-5 rounded-xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
