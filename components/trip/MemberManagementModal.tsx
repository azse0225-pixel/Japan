// components/trip/MemberManagementModal.tsx

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { addTripMember, deleteTripMember } from "@/lib/actions/trip-actions";

export function MemberManagementModal({
  isOpen,
  onClose,
  tripId,
  members,
  onRefresh,
}: any) {
  // ---------------------------------------------------------
  // 1. Hooks 放在最上方
  // ---------------------------------------------------------
  const [newMemberName, setNewMemberName] = useState("");
  // 存儲準備要刪除的成員對象 {id, name}
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ---------------------------------------------------------
  // 2. 提前回傳判斷
  // ---------------------------------------------------------
  if (!isOpen) return null;

  // ---------------------------------------------------------
  // 3. 邏輯處理
  // ---------------------------------------------------------
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    await addTripMember(tripId, newMemberName);
    setNewMemberName("");
    onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTripMember(deleteTarget.id, tripId);
      setDeleteTarget(null); // 關閉確認視窗
      onRefresh();
    } catch (e) {
      alert("刪除失敗");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* 主彈窗容器 - 加入 relative 以便讓確認視窗覆蓋 */}
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-6 bg-emerald-500 text-white flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-lg font-black italic">Trip Members</h3>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">
              管理同行夥伴
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 新增成員 Input */}
          <div className="flex gap-2">
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="輸入成員暱稱..."
              className="flex-1 bg-slate-100 p-3 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <button
              onClick={handleAddMember}
              className="px-6 py-2 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all"
            >
              新增
            </button>
          </div>

          {/* 成員列表 */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {members.length === 0 ? (
              <p className="text-center py-8 text-slate-300 font-bold italic text-sm">
                暫時沒有成員
              </p>
            ) : (
              members.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-700">{m.name}</span>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ id: m.id, name: m.name })}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🚀 自定義美化版刪除確認視窗 (覆蓋層) */}
        {deleteTarget && (
          <div className="absolute inset-0 z-[310] flex items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="p-8 w-full text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-inner">
                ⚠️
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">
                  確定要移除{" "}
                  <span className="text-rose-500">{deleteTarget.name}</span>{" "}
                  嗎？
                </h4>
                <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                  移除成員後，該成員在行程中的墊付與分帳記錄可能會受到影響喔！
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all"
                >
                  保留
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="py-3 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-200 active:scale-95 transition-all"
                >
                  確認移除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
