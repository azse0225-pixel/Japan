// components/trip/TripDetailHeader.tsx
"use client";

import Link from "next/link";

interface HeaderProps {
  title: string;
  onOpenChecklist: () => void;
  onBack: () => void; // ✨ 補上這個屬性，解決報錯
  startDate?: string; // 👈 補上這個
  selectedDay: number;
}

export default function TripDetailHeader({
  title,
  onOpenChecklist,
}: HeaderProps) {
  return (
    <div className="relative h-[240px] w-full bg-orange-100 rounded-t-[40px] overflow-hidden border-b-4 border-white">
      {/* ✨ 這是您放在 public 資料夾內的本地圖 */}
      <img
        src="/images/header.jpg"
        alt="Trip Header"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/60 via-orange-900/20 to-transparent p-8 md:p-12 flex flex-col justify-end">
        <Link
          href="/"
          className="text-white/90 font-black text-xs mb-2 uppercase italic drop-shadow-md hover:text-white transition-colors w-fit"
        >
          ← Back to trips
        </Link>
        <h1 className="text-4xl md:text-6xl font-black text-white italic drop-shadow-2xl tracking-tighter">
          {title || "My Adventure"} <span className="text-orange-400">.</span>
        </h1>
      </div>

      <button
        onClick={onOpenChecklist}
        className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-6 py-2 rounded-full font-black text-sm absolute bottom-8 right-8 shadow-xl hover:bg-white/30 transition-all active:scale-95"
      >
        🎒 行前確認
      </button>
    </div>
  );
}
