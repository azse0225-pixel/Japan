//components/home/EditButton.tsx

"use client";

import { useState } from "react";
import QuickEditModal from "./QuickEditModal";

export default function EditButton({ trip }: { trip: any }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault(); // 阻止 Link 跳轉
          e.stopPropagation(); // 阻止事件冒泡
          setShowModal(true);
        }}
        className="absolute top-6 right-6 z-20 h-10 w-10 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-slate-600 hover:bg-orange-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        ✎
      </button>

      {showModal && (
        <QuickEditModal trip={trip} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
