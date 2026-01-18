// components/trip/MemberInviteLink.tsx

"use client";

// ✅ 保持原有的導入，不做多餘更動
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function MemberInviteLink({
  memberId,
  currentEmail,
}: {
  memberId: string;
  currentEmail?: string;
}) {
  const [email, setEmail] = useState(currentEmail || "");
  const [isEditing, setIsEditing] = useState(!currentEmail);

  const handleSave = async () => {
    // 🔍 這裡維持原本的資料庫更新邏輯
    const { error } = await supabase
      .from("trip_members")
      .update({ user_email: email.toLowerCase().trim() })
      .eq("id", memberId);

    if (!error) {
      // ✨ 修正點：將「登入」相關警語改為「匿名版」友善的提示
      alert("標註成功！直接把行程網址分享給朋友，他們就能即刻加入規劃囉。");
      setIsEditing(false);
    } else {
      console.error("更新失敗:", error.message);
      alert("儲存失敗，請檢查網路連線後再試一次。");
    }
  };

  // --- 以下保持原本的渲染邏輯與樣式，完全不刪減 ---

  if (!isEditing) {
    return <span className="text-xs text-slate-400">({email})</span>;
  }

  return (
    <div className="flex gap-2">
      <input
        className="text-xs border rounded px-2"
        placeholder="填入 Email 標註或共享"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSave}
        className="text-xs bg-orange-500 text-white px-2 rounded hover:bg-orange-600 transition-colors"
      >
        儲存
      </button>
      {currentEmail && (
        <button
          onClick={() => setIsEditing(false)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          取消
        </button>
      )}
    </div>
  );
}
