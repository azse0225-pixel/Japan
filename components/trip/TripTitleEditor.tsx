"use client";

import { useState } from "react";
import { updateTripDetails } from "@/lib/actions/trip-actions";
import { useRouter } from "next/navigation";

export default function TripTitleEditor({ trip }: { trip: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(trip.title || "未命名行程");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(trip.image_url || "");
  const handleSave = async () => {
    setLoading(true);
    const result = await updateTripDetails(trip.id, {
      title,
      image_url: imageUrl, // ✨ 同步更新圖片網址
    });
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      alert("儲存失敗");
    }
    setLoading(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-3xl font-black text-slate-800 border-b-2 border-orange-500 bg-transparent outline-none px-2 py-1"
          autoFocus
        />
        <input
          type="text"
          placeholder="貼上封面圖片網址"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded border-none outline-none"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm"
        >
          {loading ? "..." : "儲存"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 mb-4">
      <h1 className="text-4xl font-black text-slate-800">
        {trip.title || "未命名行程"}
      </h1>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 hover:bg-orange-100 text-orange-600 p-2 rounded-lg text-xs font-bold"
      >
        ✎ 編輯名稱
      </button>
    </div>
  );
}
