// app/AddTripModal.tsx
"use client";

import { useState } from "react";
import { createNewTrip } from "@/lib/actions/trip-actions";

export default function AddTripModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      id: formData.get("slug") as string,
      date: formData.get("date") as string,
      location: formData.get("location") as string,
    };

    const result = await createNewTrip(data);
    if (result.success) {
      onClose();
    } else {
      alert("儲存失敗: " + result.error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-900/20 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[48px] bg-white p-10 shadow-2xl border-4 border-orange-100">
        <h2 className="text-3xl font-black text-orange-900 mb-6 italic">
          NEW ADVENTURE <span className="text-orange-400">!</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="title"
            placeholder="旅程名稱 (如: 東京櫻花祭)"
            required
            className="w-full rounded-2xl border-2 border-orange-50 bg-orange-50/30 px-5 py-3 outline-none focus:border-orange-400"
          />
          <input
            name="slug"
            placeholder="網址 ID (如: tokyo-2026)"
            required
            className="w-full rounded-2xl border-2 border-orange-50 bg-orange-50/30 px-5 py-3 outline-none focus:border-orange-400"
          />
          <input
            name="location"
            placeholder="地點 (如: 日本)"
            required
            className="w-full rounded-2xl border-2 border-orange-50 bg-orange-50/30 px-5 py-3 outline-none focus:border-orange-400"
          />
          <input
            name="date"
            type="date"
            required
            className="w-full rounded-2xl border-2 border-orange-50 bg-orange-50/30 px-5 py-3 outline-none focus:border-orange-400"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-500 hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-orange-500 py-3 font-black text-white shadow-lg hover:bg-orange-600 active:scale-95 disabled:opacity-50"
            >
              {loading ? "儲存中..." : "開始冒險!"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
