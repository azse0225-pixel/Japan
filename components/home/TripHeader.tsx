// components/home/TripHeader.tsx
"use client";

import { useState } from "react";
import AddTripModal from "./AddTripModal";

export default function TripHeader() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black text-orange-900 tracking-tighter italic">
            MY ADVENTURES
          </h1>
          <p className="text-orange-800/60 mt-3 font-bold tracking-widest uppercase text-sm">
            準備好開啟新的冒險了嗎？
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-[24px] font-black transition-all shadow-xl shadow-orange-200 active:scale-95 text-lg"
        >
          + 開始新旅程
        </button>
      </header>

      {/* ✨ 修正點：正確傳入 onClose 屬性 */}
      {showModal && <AddTripModal onClose={() => setShowModal(false)} />}
    </>
  );
}
