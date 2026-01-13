// components/trip/SpotItem.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  uploadSpotAttachment,
  deleteSpotAttachment,
} from "@/lib/actions/trip-actions";
import { CATEGORIES } from "./constants";
import { cn } from "@/lib/utils"; // 1. 先匯入工具
interface SpotItemProps {
  spot: any;
  members: any[];
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCategoryChange: (id: string, cat: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onSelect: () => void;
  onCostChange: (
    id: string,
    est: number,
    act: number,
    currency: string
  ) => void;
  onSplitChange: (
    id: string,
    payerId: string,
    invMembers: string[],
    breakdown: any
  ) => void;
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
  // --- 新增本地暫存狀態 ---
  const [localNote, setLocalNote] = useState(spot.note || "");
  const [localEst, setLocalEst] = useState(spot.estimated_cost || 0);
  const [localAct, setLocalAct] = useState(spot.actual_cost || 0);
  const [localCurrency, setLocalCurrency] = useState(spot.currency || "JPY");
  const [localBreakdown, setLocalBreakdown] = useState(
    spot.cost_breakdown || {}
  );
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
  // 使用 useRef 來存儲計時器，避免重新渲染時遺失
  const debounceTimer = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 當外部資料 (spot) 真的變動時（例如重新載入頁面），同步更新本地狀態
  useEffect(() => {
    setLocalNote(spot.note || "");
    setLocalEst(spot.estimated_cost || 0);
    setLocalAct(spot.actual_cost || 0);
    setLocalCurrency(spot.currency || "JPY");
    setLocalBreakdown(spot.cost_breakdown || {}); // ✨ 同步細項
  }, [spot.note, spot.estimated_cost, spot.actual_cost, spot.currency]);

  // 通用的防抖處理函式
  const debounceSave = (key: string, callback: () => void, delay = 800) => {
    if (debounceTimer.current[key]) clearTimeout(debounceTimer.current[key]);
    debounceTimer.current[key] = setTimeout(callback, delay);
  };
  // 3. 處理細項變動
  // SpotItem.tsx 內部

  const handleBreakdownChange = (memberId: string, amount: number) => {
    const newBreakdown = { ...localBreakdown, [memberId]: amount };
    setLocalBreakdown(newBreakdown);
    const totalAct = Object.values(newBreakdown).reduce(
      (sum: number, val: any) => sum + (Number(val) || 0),
      0
    );
    setLocalAct(totalAct);
    debounceSave(
      "split_update",
      () => {
        // 同時更新分帳細項與實支總額
        onSplitChange(
          spot.id,
          spot.payer_id,
          spot.involved_members,
          newBreakdown
        );
        onCostChange(spot.id, localEst, totalAct, localCurrency);
      },
      1000
    ); // 細項輸入通常較連續，建議給 1 秒 (1000ms)
  };
  return (
    <div
      onClick={onSelect}
      // ✨ 修正破圖關鍵：當選單開啟時提升 z-index 到 50，否則維持 10
      className={`relative flex flex-col p-4 bg-white rounded-[24px] border border-slate-100  shadow-sm hover:border-orange-200 transition-all group cursor-pointer ${
        showCatMenu ? "z-50" : "z-10"
      }`}
    >
      {/* 第一列：時間、名稱、分類與刪除按鈕 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2 flex-1">
          {/* 1. 時間標籤與分類按鈕 (縮小並排在最上方) */}
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={spot.time || ""}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-lg border-none text-[10px] outline-none shadow-sm cursor-pointer"
            />

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCatMenu(!showCatMenu);
                }}
                className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm transition-transform active:scale-95 ${currentCat.color}`}
              >
                {currentCat.icon} {currentCat.label}
              </button>

              {/* 分類切換選單 (維持原樣) */}
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

          {/* 2. 行程名稱 (給予獨立一行，寬度充足) */}
          <span className="font-black text-slate-800 text-lg md:text-xl leading-snug break-words">
            {spot.name}
          </span>
        </div>

        {/* 3. 刪除按鈕 (維持在右側) */}
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
      {/* 第二列：功能圖標與備註 */}
      <div className="mt-2 flex gap-3 items-center">
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCost(!showCost);
              setShowTickets(false);
            }}
            className={`w-8 h-8 rounded-xl flex items-center  md:text-[1rem] justify-center text-xs font-black transition-colors ${
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
            className={`w-8 h-8 text-xs rounded-xl  md:text-[1rem]  flex items-center justify-center  font-black relative transition-colors ${
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
        <input
          type="text"
          value={localNote} // 💡 綁定本地狀態
          onChange={(e) => {
            const val = e.target.value;
            setLocalNote(val); // 立即更新畫面字體，不卡頓
            debounceSave("note", () => onNoteChange(spot.id, val)); // 停下 0.8 秒後才存檔
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="點擊輸入備註..."
          className="flex-1 bg-transparent text-base text-slate-600 outline-none border-b border-transparent hover:border-slate-100 transition-all"
        />

        {/* 實支費用顯示 (修改符號部分) */}
        {spot.actual_cost > 0 && (
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
            {spot.currency === "TWD" ? "$" : "¥"}
            {spot.actual_cost.toLocaleString()} ({payerName})
          </span>
        )}
      </div>
      {/* 展開區：直覺整合式記帳盒 */}
      {showCost && (
        <div
          className="mt-4 bg-indigo-50/50 rounded-[32px] p-5 border border-indigo-100/30 space-y-4 animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 🚀 第一部分：金額輸入區 (幣別在上方) */}
          <div className="flex flex-col gap-2">
            {/* 幣別切換：置於輸入框上方 */}
            <div className="flex justify-start">
              <div className="flex bg-white/80 rounded-lg p-0.5 border border-indigo-100 shadow-sm">
                {["JPY", "TWD"].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => {
                      setLocalCurrency(curr);
                      onCostChange(spot.id, localEst, localAct, curr);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-black transition-all",
                      localCurrency === curr
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-indigo-300 hover:text-indigo-500"
                    )}
                  >
                    {curr === "JPY" ? "日幣 ¥" : "台幣 $"}
                  </button>
                ))}
              </div>
              {/* 🚀 墊錢者選單現在會緊跟在標題後面，一起靠左 */}
              <div className="flex items-center gap-2 pl-4">
                <span className="text-[9px] text-indigo-300 font-bold whitespace-nowrap">
                  誰墊付？
                </span>
                <select
                  value={spot.payer_id || ""}
                  onChange={(e) =>
                    onSplitChange(
                      spot.id,
                      e.target.value,
                      spot.involved_members,
                      localBreakdown
                    )
                  }
                  className="bg-white border border-indigo-100 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 outline-none shadow-sm focus:border-indigo-400 min-w-[100px]"
                >
                  <option value="">選擇成員</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 實支金額輸入框 */}
            <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 border border-indigo-100 shadow-sm focus-within:border-indigo-400 transition-all">
              <span className="text-lg font-black text-indigo-500">
                {localCurrency === "JPY" ? "¥" : "$"}
              </span>
              <input
                type="number"
                value={localAct || ""}
                placeholder="輸入實支金額"
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  setLocalAct(val);
                  debounceSave("cost", () =>
                    onCostChange(spot.id, localEst, val, localCurrency)
                  );
                }}
                onFocus={(e) => e.target.select()}
                className="bg-transparent w-full text-xl font-black text-slate-700 outline-none placeholder:text-slate-200"
              />
            </div>
          </div>

          {/* 🚀 第二部分：分帳明細與墊錢者 (標題與選單併排) */}
          <div className="pt-4 border-t border-indigo-100/50">
            {/* ✨ 將 justify-between 改為 justify-start，並加入 gap-4 讓兩者有間距 */}
            <div className="flex items-center justify-start gap-4 mb-3">
              <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                Split Details 分帳明細
              </label>
            </div>
            {/* 分帳成員膠囊 */}
            <div className="flex flex-wrap gap-2">
              {members.map((m: any) => {
                const isChecked = spot.involved_members?.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-1.5 p-1 rounded-xl border transition-all",
                      isChecked
                        ? "bg-white border-indigo-200 shadow-sm"
                        : "bg-transparent border-transparent opacity-50"
                    )}
                  >
                    <button
                      onClick={() => {
                        const involved = spot.involved_members || [];
                        const newInvolved = isChecked
                          ? involved.filter((id: string) => id !== m.id)
                          : [...involved, m.id];
                        onSplitChange(
                          spot.id,
                          spot.payer_id,
                          newInvolved,
                          localBreakdown
                        );
                      }}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                        isChecked
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-indigo-300 border border-indigo-100"
                      )}
                    >
                      {m.name}
                    </button>

                    {isChecked && (
                      <div className="flex items-center gap-0.5 pr-1 animate-in slide-in-from-left-1 duration-150">
                        <span className="text-[8px] text-indigo-300 font-bold">
                          {localCurrency === "JPY" ? "¥" : "$"}
                        </span>
                        <input
                          type="number"
                          value={localBreakdown[m.id] || ""}
                          placeholder="平分"
                          onChange={(e) =>
                            handleBreakdownChange(
                              m.id,
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-12 bg-transparent text-[10px] font-black text-indigo-600 outline-none placeholder:text-indigo-200"
                        />
                      </div>
                    )}
                  </div>
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
