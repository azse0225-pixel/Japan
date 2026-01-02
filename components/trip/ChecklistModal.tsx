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
    }
  }, [isOpen, tripId]);

  // 新增項目
  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const tempId = Math.random().toString(); // 暫時 ID

    // 樂觀更新 (先顯示在畫面上)
    const optimisticItem = { id: tempId, content: newItem, is_checked: false };
    setItems([...items, optimisticItem]);
    setNewItem("");

    // 寫入資料庫
    await addChecklistItem(tripId, newItem);
    // 重新抓取正確 ID
    const data = await getChecklist(tripId);
    setItems(data);
  };

  // 勾選切換
  const handleToggle = async (id: string, currentStatus: boolean) => {
    // 樂觀更新
    setItems(
      items.map((i) => (i.id === id ? { ...i, is_checked: !currentStatus } : i))
    );
    await toggleChecklistItem(id, !currentStatus);
  };

  // 刪除
  const handleDelete = async (id: string) => {
    setItems(items.filter((i) => i.id !== id));
    await deleteChecklistItem(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 視窗本體 */}
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border-4 border-white">
        {/* 標題區 */}
        <div className="p-6 pb-2 border-b border-slate-100 flex justify-between items-center bg-orange-50 rounded-t-[28px]">
          <h3 className="text-xl font-black text-orange-900 flex items-center gap-2">
            🎒 行前檢查清單
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white text-orange-400 rounded-full font-bold shadow-sm hover:bg-orange-100 transition-all"
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
                    : "bg-white hover:bg-orange-50/50"
                }`}
              >
                {/* 核取方塊 */}
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

                {/* 文字 */}
                <span
                  className={`flex-1 font-bold text-sm transition-all ${
                    item.is_checked
                      ? "text-slate-400 line-through decoration-2"
                      : "text-slate-700"
                  }`}
                >
                  {item.content}
                </span>

                {/* 刪除按鈕 (Hover 才出現) */}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* 輸入區 */}
        <div className="p-4 bg-slate-50 rounded-b-[28px] border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="新增項目 (例如: 買網卡)..."
              className="flex-1 px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-300 font-bold text-sm"
              autoFocus
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
