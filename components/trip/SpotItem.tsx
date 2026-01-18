// components/trip/SpotItem.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  uploadSpotAttachment,
  deleteSpotAttachment,
} from "@/lib/actions/trip-actions";
import { CATEGORIES } from "./constants";
import { cn } from "@/lib/utils";

interface SpotItemProps {
  spot: any;
  members: any[];
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCategoryChange: (id: string, cat: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onSelect: () => void;
  onOpenExpenseModal: (spot: any) => void; // ✨ 點擊 $ 開啟彈窗
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
  onOpenExpenseModal,
  onAttachmentChange,
}: SpotItemProps) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localNote, setLocalNote] = useState(spot.note || "");
  const debounceTimer = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 當外部資料變動時同步備註
  useEffect(() => {
    setLocalNote(spot.note || "");
  }, [spot.note]);

  const debounceSave = (key: string, callback: () => void, delay = 800) => {
    if (debounceTimer.current[key]) clearTimeout(debounceTimer.current[key]);
    debounceTimer.current[key] = setTimeout(callback, delay);
  };

  const currentCat =
    CATEGORIES.find((c) => c.id === spot.category) || CATEGORIES[0];

  // 計算本站總金額
  const totalAct =
    spot.expense_list?.reduce(
      (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
      0
    ) || 0;

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
      className={cn(
        "relative flex flex-col p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:border-orange-200 transition-all group cursor-pointer",
        showCatMenu ? "z-50" : "z-10"
      )}
    >
      {/* 🚀 第一部分：行程標題列 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={spot.time || ""}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-orange-500 text-white font-black px-2 py-0.5 rounded-lg border-none text-[10px] outline-none shadow-sm cursor-pointer"
            />

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCatMenu(!showCatMenu);
                }}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm transition-transform active:scale-95",
                  currentCat.color
                )}
              >
                {currentCat.icon} {currentCat.label}
              </button>

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
          <span className="font-black text-slate-800 text-lg md:text-xl leading-snug break-words">
            {spot.name}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(spot.id);
          }}
          className="p-1 -mr-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* 🚀 第二部分：功能圖標與備註 */}
      <div className="mt-3 flex gap-3 items-center">
        <div className="flex gap-1.5">
          {/* ✨ 記帳按鈕：改為觸發彈窗 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenExpenseModal(spot);
            }}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all",
              totalAct > 0
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
                : "bg-slate-50 text-slate-300 hover:bg-slate-100"
            )}
          >
            $
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTickets(!showTickets);
            }}
            className={cn(
              "w-8 h-8 text-xs rounded-xl flex items-center justify-center font-black relative transition-colors",
              spot.attachments?.length > 0
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-50 text-slate-300"
            )}
          >
            📎
            {spot.attachments?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                {spot.attachments.length}
              </span>
            )}
          </button>
        </div>

        <input
          type="text"
          value={localNote}
          onChange={(e) => {
            setLocalNote(e.target.value);
            debounceSave("note", () => onNoteChange(spot.id, e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="輸入備註..."
          className="flex-1 bg-transparent text-sm text-slate-500 outline-none border-b border-transparent hover:border-slate-100 transition-all"
        />

        {/* 總額標籤 (唯讀) */}
        {totalAct > 0 && (
          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 whitespace-nowrap">
            {spot.currency === "TWD" ? "$" : "¥"}
            {totalAct.toLocaleString()}
          </div>
        )}
      </div>

      {/* 🚀 第三部分：展開區 - 附件預覽 */}
      {showTickets && (
        <div
          className="mt-3 bg-blue-50/50 rounded-[24px] p-4 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
              附件與票券
            </h4>
            <label className="bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold cursor-pointer hover:bg-blue-600 transition-colors">
              {isUploading ? "上傳中..." : "+ 新增"}
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
                className="relative aspect-square bg-white rounded-xl overflow-hidden border border-blue-100 group shadow-sm"
              >
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt="att"
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
