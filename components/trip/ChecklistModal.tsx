// components/trip/ChecklistModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  getChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/lib/actions/trip-actions";

// 🚀 傳入 members 陣列
export default function ChecklistModal({
  tripId,
  isOpen,
  onClose,
  members = [],
}: any) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  // 🚀 狀態：目前選中的成員（預設為第一個人）
  const [activeMemberId, setActiveMemberId] = useState<string>(
    members[0]?.id || "",
  );

  useLockBodyScroll(isOpen);

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

  // 🚀 3. 過濾出目前選中成員的清單
  const filteredItems = useMemo(() => {
    return items.filter((item) => item.member_id === activeMemberId);
  }, [items, activeMemberId]);

  // 🚀 4. 計算該成員的完成進度
  const progress = useMemo(() => {
    if (filteredItems.length === 0) return 0;
    const checked = filteredItems.filter((i) => i.is_checked).length;
    return Math.round((checked / filteredItems.length) * 100);
  }, [filteredItems]);

  const handleAdd = async () => {
    if (!newItem.trim() || !activeMemberId) return;

    const tempId = Math.random().toString();
    const optimisticItem = {
      id: tempId,
      content: newItem,
      is_checked: false,
      member_id: activeMemberId, // 🚀 標記屬於誰
    };

    setItems([...items, optimisticItem]);
    setNewItem("");

    // 🚀 這裡後端 action 也要記得改為能接收 member_id
    await addChecklistItem(tripId, newItem, activeMemberId);
    const data = await getChecklist(tripId);
    setItems(data);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setItems(
      items.map((i) =>
        i.id === id ? { ...i, is_checked: !currentStatus } : i,
      ),
    );
    await toggleChecklistItem(id, !currentStatus);
  };

  const handleDelete = async (id: string) => {
    setItems(items.filter((i) => i.id !== id));
    await deleteChecklistItem(id, tripId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* 手機把手 */}
        <div className="sm:hidden w-full flex justify-center pt-4 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* 🚀 成員切換 Tab 區塊 */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {members.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setActiveMemberId(m.id)}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap",
                  activeMemberId === m.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200",
                )}
              >
                {m.name} 的清單
              </button>
            ))}
          </div>
        </div>

        {/* 進度顯示 */}
        <div className="px-8 py-4 space-y-3">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-black text-slate-800 italic">
              Personal Pack.
            </h3>
            <span className="text-xl font-black text-orange-500">
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500 "
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 清單內容 */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-xs font-bold animate-pulse">
              讀取個人清單中...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[30px] border-2 border-dashed border-slate-100">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-slate-400 font-bold text-xs italic">
                這個人還沒想好要帶什麼...
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-[24px] transition-all border text-slate-900",
                  item.is_checked
                    ? "bg-slate-50 border-transparent opacity-60"
                    : "bg-white border-slate-100 shadow-sm",
                )}
              >
                <button
                  onClick={() => handleToggle(item.id, item.is_checked)}
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all",
                    item.is_checked
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-slate-200",
                  )}
                >
                  {item.is_checked && "✓"}
                </button>
                <span
                  className={cn(
                    "flex-1 font-bold text-sm",
                    item.is_checked && "line-through text-slate-400",
                  )}
                >
                  {item.content}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* 輸入區 */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 pb-10 sm:pb-6">
          <div className="flex gap-3 bg-white p-1.5 rounded-[22px] shadow-inner border border-slate-100">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`幫 ${members.find((m: any) => m.id === activeMemberId)?.name || ""} 增加項目...`}
              className="flex-1 px-4 py-2 bg-transparent outline-none font-bold text-sm text-slate-700"
            />
            <button
              onClick={handleAdd}
              className="bg-orange-500 text-white w-10 h-10 rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
