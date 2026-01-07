// components/trip/SpotItem.tsx
"use client";
import { useState } from "react";
import {
  uploadSpotAttachment,
  deleteSpotAttachment,
} from "@/lib/actions/trip-actions";
import { CATEGORIES } from "./constants";

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
}: any) {
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
      className="relative flex flex-col p-3 bg-white rounded-2xl border border-slate-100 mb-2 shadow-sm hover:border-orange-100 transition-all group z-10 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="time"
            value={spot.time || ""}
            onChange={(e) => onTimeChange(spot.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-orange-500 text-white font-black px-2 py-1 rounded-lg border-none text-xs outline-none shadow-sm"
          />
          <span className="font-bold text-slate-800">{spot.name}</span>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCatMenu(!showCatMenu);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentCat.color}`}
            >
              {currentCat.icon} {currentCat.label}
            </button>
            {showCatMenu && (
              <div className="absolute left-0 mt-1 w-32 bg-white border border-slate-100 rounded-xl shadow-2xl z-[70] p-2 animate-in zoom-in duration-150">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCategoryChange(spot.id, c.id);
                      setShowCatMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(spot.id);
          }}
          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="mt-1 flex gap-2 items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCost(!showCost);
            setShowTickets(false);
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
            spot.actual_cost > 0
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-400"
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
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black relative transition-all ${
            spot.attachments?.length > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          📎
          {spot.attachments?.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
              {spot.attachments.length}
            </span>
          )}
        </button>
        <input
          type="text"
          value={spot.note || ""}
          onChange={(e) => onNoteChange(spot.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="備註..."
          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 text-xs text-slate-500 outline-none transition-all"
        />
        {spot.actual_cost > 0 && (
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            ¥{spot.actual_cost.toLocaleString()} ({payerName})
          </span>
        )}
      </div>

      {showCost && (
        <div
          className="mt-3 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">
              預算 ¥
            </label>
            <input
              type="number"
              value={spot.estimated_cost || 0}
              onChange={(e) =>
                onCostChange(spot.id, Number(e.target.value), spot.actual_cost)
              }
              className="bg-transparent w-full text-base font-black text-slate-700 outline-none"
            />
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
            <label className="text-[9px] text-emerald-600/70 font-bold uppercase block mb-0.5">
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
              className="bg-transparent w-full text-base font-black text-emerald-700 outline-none"
            />
          </div>
          <div className="col-span-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
            <select
              value={spot.payer_id || ""}
              onChange={(e) =>
                onSplitChange(spot.id, e.target.value, spot.involved_members)
              }
              className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1.5 w-full font-bold text-indigo-700 outline-none mb-2"
            >
              <option value="">(誰墊錢?)</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      isChecked
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
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

      {showTickets && (
        <div
          className="mt-2 bg-blue-50 rounded-xl p-3 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
              🎫 票券與附件
            </h4>
            <label className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-bold cursor-pointer hover:bg-blue-600 transition-colors">
              {isUploading ? "上傳中..." : "+ 上傳"}
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
                className="relative aspect-square bg-white rounded-xl overflow-hidden border border-blue-100 shadow-sm group/thumb"
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
                  className="absolute top-1 right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[8px] opacity-0 group-hover/thumb:opacity-100 transition-opacity"
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
