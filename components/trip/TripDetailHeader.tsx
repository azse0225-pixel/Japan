// components/trip/TripDetailHeader.tsx
"use client";

import Link from "next/link";

interface HeaderProps {
  title: string;
  onOpenChecklist: () => void;
  onOpenPocketList: () => void; // 🚀 新增這行
  onBack: () => void; // ✨ 補上這個屬性，解決報錯
  startDate?: string; // 👈 補上這個
  selectedDay: number;
}

export default function TripDetailHeader({
  title,
  onOpenChecklist,
  onOpenPocketList,
}: HeaderProps) {
  return (
    /* 1. 調整高度：手機版減低到 180px，桌機版增加到 300px */
    <div className="relative min-h-[180px] md:h-[300px] w-full bg-orange-100 rounded-t-[40px] overflow-hidden border-b-4 border-white">
      <img
        src="/images/header.jpg"
        alt="Trip Header"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 遮罩與文字內容容器 */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/70 via-orange-900/30 to-transparent p-6 md:p-12 flex flex-col justify-end">
        {/* 返回按鈕 */}
        <Link
          href="/"
          className="text-white/90 font-black text-[10px] md:text-xs mb-2 uppercase italic drop-shadow-md hover:text-white transition-colors w-fit"
        >
          ← Back to trips
        </Link>

        {/* 2. 標題與按鈕容器：手機版 flex-col (上下)，桌機版 md:flex-row (左右) */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h1 className="text-3xl md:text-6xl font-black text-white italic drop-shadow-2xl tracking-tighter leading-tight">
            {title || "My Adventure"}
            <span className="text-orange-400">.</span>
          </h1>
          <div className="flex gap-2 shrink-0">
            {" "}
            {/* 🚀 變成組合按鈕 */}
            {/* 備忘錄按鈕 */}
            <button
              onClick={onOpenPocketList}
              className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-4 py-2 md:px-5 md:py-3 rounded-full font-black text-xs md:text-sm shadow-xl hover:bg-amber-500/40 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>💡</span> 暫定行程
            </button>
            {/* 行前確認按鈕 */}
            <button
              onClick={onOpenChecklist}
              className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-4 py-2 md:px-5 md:py-3 rounded-full font-black text-xs md:text-sm shadow-xl hover:bg-white/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>🎒</span> 行前確認
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
