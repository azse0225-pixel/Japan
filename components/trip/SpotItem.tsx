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
  onLinkChange: (id: string, links: any[]) => void;
  onSelect: () => void;
  onOpenExpenseModal: (spot: any) => void;
  onAttachmentChange: () => void;
}

export default function SpotItem({
  spot,
  members,
  onDelete,
  onNoteChange,
  onCategoryChange,
  onTimeChange,
  onLinkChange,
  onSelect,
  onOpenExpenseModal,
  onAttachmentChange,
}: SpotItemProps) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [localNote, setLocalNote] = useState(spot.note || "");
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const debounceTimer = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const links = spot.links || []; // 確保是陣列
  useEffect(() => {
    setLocalNote(spot.note || "");
  }, [spot.note]);
  const debounceSave = (key: string, callback: () => void, delay = 800) => {
    if (debounceTimer.current[key]) clearTimeout(debounceTimer.current[key]);
    debounceTimer.current[key] = setTimeout(callback, delay);
  };

  const currentCat =
    CATEGORIES.find((c) => c.id === spot.category) || CATEGORIES[0];

  const totalAct =
    spot.expense_list?.reduce(
      (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
      0,
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
  const displayCurrency = spot.expense_list?.[0]?.currency || "JPY";
  // 新增/修改連結的邏輯
  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    const updatedLinks = [...links, { title: newLinkTitle, url: newLinkUrl }];
    onLinkChange(spot.id, updatedLinks);
    setNewLinkTitle(""); // 清空輸入框
    setNewLinkUrl("");
  };

  const handleDeleteLink = (index: number) => {
    const updatedLinks = links.filter((_: any, i: number) => i !== index);
    onLinkChange(spot.id, updatedLinks);
  };
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative flex flex-col p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:border-orange-200 transition-all group cursor-pointer",
        showCatMenu || isConfirmingDelete ? "z-50" : "z-10",
      )}
    >
      {/* 刪除確認覆蓋層 (只有在 isConfirmingDelete 為 true 時顯示) */}
      {isConfirmingDelete && (
        <div
          className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-sm rounded-[24px] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} // 防止點擊確認框時觸發卡片選擇
        >
          <p className="text-xs font-black text-slate-800 mb-3 text-center">
            確定要刪除「{spot.name}」嗎？
            <br />
            <span className="text-rose-500 text-[10px]">
              相關費用與附件也會一併移除喔！
            </span>
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black hover:bg-slate-200"
            >
              取消
            </button>
            <button
              onClick={() => {
                onDelete(spot.id);
                setIsConfirmingDelete(false);
              }}
              className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-rose-100"
            >
              確定刪除
            </button>
          </div>
        </div>
      )}

      {/* 第一部分：行程標題列 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={spot.time || ""}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-orange-500 text-white font-black px-2 py-0.5 rounded-lg border-none text-[10px] outline-none shadow-sm cursor-pointer shrink-0"
            />

            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCatMenu(!showCatMenu);
                }}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm transition-transform active:scale-95 shrink-0",
                  currentCat.color,
                )}
              >
                {currentCat.icon} {currentCat.label}
              </button>

              <a
                href={
                  spot.place_id
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        spot.name,
                      )}&query_place_id=${spot.place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
                }
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-all active:scale-95 shrink-0 border border-slate-200/50"
              >
                <span className="text-[10px]">📍</span>
                <span className="whitespace-nowrap">開啟地圖</span>
              </a>

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

        {/* 刪除按鈕 (✕)：修改為先開啟確認介面 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirmingDelete(true); //  點擊後不直接刪除，改為顯示確認框
          }}
          className="p-1 -mr-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* 第二部分：功能圖標與備註 */}
      <div className="mt-3 flex gap-3 items-center">
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenExpenseModal(spot);
            }}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all",
              totalAct > 0
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
                : "bg-slate-50 text-slate-300 hover:bg-slate-100",
            )}
          >
            $
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTickets(!showTickets);
              setShowLinkSection(false);
            }}
            className={cn(
              "w-8 h-8 text-xs rounded-xl flex items-center justify-center font-black relative transition-colors",
              spot.attachments?.length > 0
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-50 text-slate-300",
            )}
          >
            📎
            {spot.attachments?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                {spot.attachments.length}
              </span>
            )}
          </button>
          {/* @ 超連結按鈕：修改邏輯 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLinkSection(!showLinkSection);
              setShowTickets(false);
            }}
            className={cn(
              "w-8 h-8 text-xs rounded-xl flex items-center justify-center font-black transition-all ",
              links.length > 0
                ? "bg-indigo-500 text-white shadow-md"
                : "bg-slate-50 text-slate-300",
            )}
          >
            @
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

        {totalAct > 0 && (
          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 whitespace-nowrap">
            {/* 這裡改用 displayCurrency 來判定 */}
            {displayCurrency === "TWD" ? "$" : "¥"}
            {totalAct.toLocaleString()}
          </div>
        )}
      </div>

      {/*  第三部分：展開區 - 附件預覽 */}
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
      {/*  第四部分：展開區 - 超連結編輯器 */}
      {showLinkSection && (
        <div
          className="mt-3 bg-indigo-50/50 rounded-[24px] p-5 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 px-1">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              參考連結清單
            </h4>
          </div>

          {/* 1. 顯示已有的連結清單 */}
          <div className="space-y-2 mb-5">
            {links.length > 0 ? (
              links.map((link: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm group hover:border-indigo-300 transition-all"
                >
                  <div
                    className="flex flex-col flex-1 min-w-0 mr-2 cursor-pointer"
                    onClick={() => {
                      const url = link.url.startsWith("http")
                        ? link.url
                        : `https://${link.url}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <span className="text-[11px] font-black text-slate-700 truncate">
                      {link.title}
                    </span>
                    <span className="text-[9px] text-indigo-400 truncate hover:underline">
                      {link.url}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(idx)}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="py-4 text-center border-2 border-dashed border-indigo-100 rounded-2xl text-[10px] text-slate-400 font-bold italic">
                尚未新增任何連結
              </div>
            )}
          </div>

          {/* 2. 新增連結輸入區 (這才是你唯一的輸入區) */}
          <div className="bg-white/60 p-4 rounded-[20px] border border-indigo-100/50 space-y-3">
            <input
              type="text"
              placeholder="名稱 (例: 官方菜單)"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-700 border border-transparent focus:border-indigo-400 outline-none transition-all shadow-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="貼上網址 https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                className="flex-1 px-4 py-2.5 bg-white rounded-xl text-xs font-bold text-slate-700 border border-transparent focus:border-indigo-400 outline-none transition-all shadow-sm"
              />
              <button
                onClick={handleAddLink}
                disabled={!newLinkTitle || !newLinkUrl}
                className="px-4 bg-indigo-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-100 disabled:opacity-30 transition-all"
              >
                新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
