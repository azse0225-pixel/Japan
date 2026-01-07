// components/trip/SpotItem.tsx
"use client";

import { useState } from "react";
import {
  uploadSpotAttachment,
  deleteSpotAttachment,
} from "@/lib/actions/trip-actions";
import { CATEGORIES } from "./constants";

interface SpotItemProps {
  spot: any;
  members: any[];
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCategoryChange: (id: string, cat: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onSelect: () => void;
  onCostChange: (id: string, est: number, act: number) => void;
  onSplitChange: (id: string, payerId: string, invMembers: string[]) => void;
  onAttachmentChange: () => void;
}

export default function SpotItem({
  spot,
  members,
  onDelete,
  onNoteChange,
  onCategoryChange,
  onTimeChange,
  onSelect,
  onCostChange,
  onSplitChange,
  onAttachmentChange,
}: SpotItemProps) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentCat =
    CATEGORIES.find((c) => c.id === spot.category) || CATEGORIES[0];
  const payerName =
    members.find((m: any) => m.id === spot.payer_id)?.name || "有人";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      await uploadSpotAttachment(spot.id, formData);
      onAttachmentChange();
    } catch (err) {
      alert("上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      // ✨ 修正破圖關鍵：當選單開啟時提升 z-index 到 50，否則維持 10
      className={`relative flex flex-col p-4 bg-white rounded-[24px] border border-slate-100  shadow-sm hover:border-orange-200 transition-all group cursor-pointer ${
        showCatMenu ? "z-50" : "z-10"
      }`}
    >
      {/* 第一列：時間、名稱、分類 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* 時間標籤：恢復活力橘 */}
          <input
            type="time"
            value={spot.time || ""}
            onChange={(e) => onTimeChange(spot.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-orange-500 text-white font-black px-3 py-1 rounded-xl border-none text-xs outline-none shadow-sm"
          />
          <span className="font-bold text-slate-800 text-lg">{spot.name}</span>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCatMenu(!showCatMenu);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm transition-transform active:scale-95 ${currentCat.color}`}
            >
              {currentCat.icon} {currentCat.label}
            </button>

            {/* 分類切換選單 */}
            {showCatMenu && (
              <div className="absolute left-0 mt-2 w-36 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] p-2 animate-in zoom-in duration-200">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategoryChange(spot.id, c.id);
                      setShowCatMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-orange-50 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                  >
                    <span className="text-sm">{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 刪除按鈕 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(spot.id);
          }}
          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 第二列：功能圖標與備註 */}
      <div className="mt-2 flex gap-3 items-center">
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCost(!showCost);
              setShowTickets(false);
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
              spot.actual_cost > 0
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-50 text-slate-300"
            }`}
          >
            $
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTickets(!showTickets);
              setShowCost(false);
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black relative transition-colors ${
              spot.attachments?.length > 0
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-50 text-slate-300"
            }`}
          >
            📎
            {spot.attachments?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                {spot.attachments.length}
              </span>
            )}
          </button>
        </div>

        {/* 備註：正體字，移除斜體 */}
        <input
          type="text"
          value={spot.note || ""}
          onChange={(e) => onNoteChange(spot.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="點擊輸入備註..."
          className="flex-1 bg-transparent text-sm text-slate-400 outline-none border-b border-transparent hover:border-slate-100 transition-all"
        />

        {/* 實支費用顯示 */}
        {spot.actual_cost > 0 && (
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
            ¥{spot.actual_cost.toLocaleString()} ({payerName})
          </span>
        )}
      </div>

      {/* 展開區：費用與分帳 */}
      {showCost && (
        <div
          className="mt-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">
              預算 ¥
            </label>
            <input
              type="number"
              value={spot.estimated_cost || 0}
              onChange={(e) =>
                onCostChange(spot.id, Number(e.target.value), spot.actual_cost)
              }
              className="bg-transparent w-full text-lg font-black text-slate-700 outline-none"
            />
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
            <label className="text-[9px] text-emerald-600/70 font-bold uppercase block mb-1">
              實支 ¥
            </label>
            <input
              type="number"
              value={spot.actual_cost || 0}
              onChange={(e) =>
                onCostChange(
                  spot.id,
                  spot.estimated_cost,
                  Number(e.target.value)
                )
              }
              className="bg-transparent w-full text-lg font-black text-emerald-700 outline-none"
            />
          </div>

          <div className="col-span-2 bg-indigo-50 rounded-[24px] p-4 border border-indigo-100">
            <label className="text-[9px] text-indigo-400 font-bold uppercase block mb-2">
              誰墊錢？
            </label>
            <select
              value={spot.payer_id || ""}
              onChange={(e) =>
                onSplitChange(spot.id, e.target.value, spot.involved_members)
              }
              className="text-xs bg-white border border-indigo-200 rounded-xl px-3 py-2 w-full font-bold text-indigo-700 outline-none mb-3 shadow-sm"
            >
              <option value="">(選擇墊錢成員)</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <label className="text-[9px] text-indigo-400 font-bold uppercase block mb-2">
              分帳成員
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m: any) => {
                const involved = Array.isArray(spot.involved_members)
                  ? spot.involved_members
                  : [];
                const isChecked = involved.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      onSplitChange(
                        spot.id,
                        spot.payer_id,
                        isChecked
                          ? involved.filter((id: any) => id !== m.id)
                          : [...involved, m.id]
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                      isChecked
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                        : "bg-white text-indigo-400 border-indigo-100"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 展開區：附件預覽 */}
      {showTickets && (
        <div
          className="mt-3 bg-blue-50 rounded-[24px] p-4 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
              🎫 附件與票券
            </h4>
            <label className="bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold cursor-pointer hover:bg-blue-600 transition-colors">
              {isUploading ? "上傳中..." : "+ 新增附件"}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {spot.attachments?.map((url: string, idx: number) => (
              <div
                key={idx}
                className="relative aspect-square bg-white rounded-xl overflow-hidden border border-blue-100 group"
              >
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt="attachment"
                    className="w-full h-full object-cover"
                  />
                </a>
                <button
                  onClick={async () => {
                    if (confirm("確定刪除此附件?")) {
                      await deleteSpotAttachment(spot.id, url);
                      onAttachmentChange();
                    }
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
